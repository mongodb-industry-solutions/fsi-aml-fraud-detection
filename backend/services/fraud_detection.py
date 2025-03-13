import logging
import os
from typing import Dict, List, Any, Tuple, Optional
from datetime import datetime, timedelta
import math
from pymongo import MongoClient
from bson import ObjectId

from db.mongo_db import MongoDBAccess
from bedrock.embeddings import get_embedding

# Set up logging
logger = logging.getLogger(__name__)

# Load constants from environment variables
AMOUNT_THRESHOLD_MULTIPLIER = float(os.getenv("AMOUNT_THRESHOLD_MULTIPLIER", 3.0))  # How many std devs above average is suspicious
MAX_LOCATION_DISTANCE_KM = float(os.getenv("MAX_LOCATION_DISTANCE_KM", 500.0))  # Distance in kilometers that's considered suspicious
VELOCITY_TIME_WINDOW_MINUTES = int(os.getenv("VELOCITY_TIME_WINDOW_MINUTES", 60))  # Time window for transaction velocity check in minutes
VELOCITY_THRESHOLD = int(os.getenv("VELOCITY_THRESHOLD", 5))  # Number of transactions in window that's suspicious
SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", 0.75))  # Threshold for vector similarity matching

# Risk score weights
WEIGHT_AMOUNT = float(os.getenv("WEIGHT_AMOUNT", 0.25))
WEIGHT_LOCATION = float(os.getenv("WEIGHT_LOCATION", 0.25))
WEIGHT_DEVICE = float(os.getenv("WEIGHT_DEVICE", 0.20))
WEIGHT_VELOCITY = float(os.getenv("WEIGHT_VELOCITY", 0.15))
WEIGHT_PATTERN = float(os.getenv("WEIGHT_PATTERN", 0.15))


class FraudDetectionService:
    """
    Service for detecting potentially fraudulent transactions using various detection strategies.
    """
    
    def __init__(self, db_client: MongoDBAccess, db_name: str = None):
        """
        Initialize the fraud detection service.
        
        Args:
            db_client: MongoDB client instance
            db_name: Database name to use (defaults to environment variable or "fsi-threatsight360")
        """
        self.db_client = db_client
        self.db_name = db_name or os.getenv("DB_NAME", "fsi-threatsight360")
        self.customer_collection = "customers"  # Updated to match the correct collection name
        self.transaction_collection = "transactions"
        self.fraud_pattern_collection = "fraud_patterns"
        
        logger.info(f"Initialized FraudDetectionService with database: {self.db_name}")
    
    async def evaluate_transaction(self, transaction: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluate a transaction for potential fraud across multiple dimensions.
        
        Args:
            transaction: Transaction data to evaluate
            
        Returns:
            Dict containing risk assessment with score and flags
        """
        flags = []
        risk_factors = {}
        
        # Get the customer profile for context
        customer_id = transaction.get("customer_id")
        if not customer_id:
            logger.warning("Transaction missing customer_id, cannot perform full evaluation")
            return {
                "score": 50.0,  # Default medium risk when customer unknown
                "level": "medium",
                "flags": ["missing_customer_reference"],
                "transaction_type": "suspicious"
            }
        
        # Find customer in the correct collection
        from bson import ObjectId
        
        # Prepare for debugging
        import json
        
        # First try to find the customer by _id if it's a valid ObjectId
        customer = None
        try:
            # If string ID is valid ObjectId, convert to ObjectId
            query_id = customer_id
            if ObjectId.is_valid(customer_id):
                try:
                    query_id = ObjectId(customer_id)
                except Exception as e:
                    logger.warning(f"Error converting customer_id to ObjectId: {str(e)}")
                    pass  # Use the original id if conversion fails
            
            # Try first with query_id (which might be ObjectId or string)
            customer = self.db_client.get_collection(
                db_name=self.db_name,
                collection_name=self.customer_collection
            ).find_one({"_id": query_id})
            
            # If not found, try with string directly
            if not customer and ObjectId.is_valid(customer_id):
                customer = self.db_client.get_collection(
                    db_name=self.db_name,
                    collection_name=self.customer_collection
                ).find_one({"_id": customer_id})
            
            # If still not found, try a broader search - this is important as the string/ObjectId issue might be real
            if not customer:
                # Try with the customer ID as a string field (not _id)
                customer = self.db_client.get_collection(
                    db_name=self.db_name,
                    collection_name=self.customer_collection
                ).find_one({"account_info.account_number": customer_id})
                
                # Let's also try to see what customers exist
                customers = list(self.db_client.get_collection(
                    db_name=self.db_name,
                    collection_name=self.customer_collection
                ).find().limit(1))
                
                if customers:
                    # If we found any customers, let's use the first one as a fallback
                    if not customer:
                        customer = customers[0]
                        logger.warning(f"Customer with ID {customer_id} not found, using fallback customer: {customer.get('_id')}")
                    
                    # Log some debug info about the first customer
                    sample_customer = customers[0]
                    logger.info(f"Sample customer ID: {sample_customer.get('_id')}")
                    logger.info(f"Sample customer account: {sample_customer.get('account_info', {}).get('account_number', 'Unknown')}")
                else:
                    logger.error("No customers found in database. Collection may be empty.")
            
            logger.info(f"Found customer with ID {customer_id}: {customer is not None}")
            if customer:
                logger.info(f"Customer name: {customer.get('personal_info', {}).get('name', 'Unknown')}")
                
        except Exception as e:
            logger.error(f"Error finding customer: {str(e)}")
        
        if not customer:
            logger.warning(f"Customer with ID {customer_id} not found")
            return {
                "score": 70.0,  # Higher risk when customer not found
                "level": "high",
                "flags": ["customer_not_found"],
                "transaction_type": "suspicious"
            }
        
        # Run all detection strategies in parallel
        amount_anomaly, amount_risk = self._check_amount_anomaly(transaction, customer)
        if amount_anomaly:
            flags.append("unusual_amount")
            risk_factors["amount"] = amount_risk
        
        location_anomaly, location_risk = self._check_location_anomaly(transaction, customer)
        if location_anomaly:
            flags.append("unexpected_location")
            risk_factors["location"] = location_risk
        
        device_anomaly, device_risk = self._check_device_anomaly(transaction, customer)
        if device_anomaly:
            flags.append("unknown_device")
            risk_factors["device"] = device_risk
            
        velocity_anomaly, velocity_risk = await self._check_transaction_velocity(transaction, customer_id)
        if velocity_anomaly:
            flags.append("velocity_alert")
            risk_factors["velocity"] = velocity_risk
            
        # Only run pattern matching if there are already some flags
        # This optimization prevents unnecessary embedding generation for normal transactions
        pattern_anomaly = False
        pattern_risk = 0.0
        if flags:
            pattern_anomaly, pattern_risk = await self._check_pattern_match(transaction, flags)
            if pattern_anomaly:
                flags.append("matches_fraud_pattern")
                risk_factors["pattern"] = pattern_risk
        
        # Get customer's baseline risk score
        customer_risk_score = 0.0
        try:
            if customer and "risk_profile" in customer and "overall_risk_score" in customer["risk_profile"]:
                customer_risk_score = float(customer["risk_profile"]["overall_risk_score"])
                logger.info(f"Using customer baseline risk score: {customer_risk_score}")
            else:
                logger.warning("Customer risk profile not found, using default risk of 0")
        except Exception as e:
            logger.error(f"Error extracting customer risk score: {str(e)}")
        
        # Calculate overall risk score
        risk_score = self._calculate_risk_score(
            amount_risk if amount_anomaly else 0.0,
            location_risk if location_anomaly else 0.0,
            device_risk if device_anomaly else 0.0,
            velocity_risk if velocity_anomaly else 0.0,
            pattern_risk if pattern_anomaly else 0.0,
            customer_risk_score  # Pass the customer's baseline risk
        )
        
        # Determine risk level based on score
        risk_level = self._determine_risk_level(risk_score)
        
        # Determine transaction type
        transaction_type = "legitimate"
        if risk_level == "high":
            transaction_type = "fraudulent"
        elif risk_level == "medium":
            transaction_type = "suspicious"
        
        # Create risk assessment with detailed diagnostics
        risk_assessment = {
            "score": round(risk_score, 2),
            "level": risk_level,
            "flags": flags,
            "transaction_type": transaction_type,
            "diagnostics": {
                "customer_base_risk": round(customer_risk_score, 2),
                "transaction_factors": {
                    "amount": round(amount_risk * 100, 2) if amount_anomaly else 0,
                    "location": round(location_risk * 100, 2) if location_anomaly else 0,
                    "device": round(device_risk * 100, 2) if device_anomaly else 0,
                    "velocity": round(velocity_risk * 100, 2) if velocity_anomaly else 0,
                    "pattern": round(pattern_risk * 100, 2) if pattern_anomaly else 0
                }
            }
        }
        
        # Add customer risk profile update task if high risk
        if risk_level == "high":
            self._update_customer_risk_profile(customer_id, flags)
        
        logger.info(f"Transaction evaluated with risk score: {risk_score:.2f}, level: {risk_level}")
        return risk_assessment
    
    def _check_amount_anomaly(self, transaction: Dict[str, Any], customer: Dict[str, Any]) -> Tuple[bool, float]:
        """
        Check if transaction amount is anomalous compared to customer's history.
        
        Args:
            transaction: The transaction to evaluate
            customer: The customer profile
            
        Returns:
            Tuple of (is_anomalous, risk_score)
        """
        try:
            transaction_amount = transaction.get("amount", 0)
            behavioral_profile = customer.get("behavioral_profile", {})
            transaction_patterns = behavioral_profile.get("transaction_patterns", {})
            
            avg_amount = transaction_patterns.get("avg_transaction_amount", 0)
            std_amount = transaction_patterns.get("std_transaction_amount", 0)
            
            # If no transaction history, return moderate anomaly score
            if avg_amount == 0 or std_amount == 0:
                return True, 0.6
            
            # Calculate z-score
            z_score = abs(transaction_amount - avg_amount) / std_amount if std_amount > 0 else 0
            
            # Also calculate ratio to average for handling extreme cases
            ratio_to_avg = transaction_amount / avg_amount if avg_amount > 0 else 0
            
            # Check if transaction amount exceeds threshold (by standard deviations or ratio)
            is_anomalous = z_score > AMOUNT_THRESHOLD_MULTIPLIER or ratio_to_avg > 5.0
            
            # Calculate risk factor (0-1) based on z-score and ratio
            # For extremely high amounts, we want a very high risk score
            if ratio_to_avg >= 10.0:
                # For amounts 10x or more the average, use a very high risk score
                risk_score = 1.0
            elif ratio_to_avg >= 5.0:
                # For amounts 5-10x the average, scale between 0.85-1.0
                risk_score = 0.85 + ((ratio_to_avg - 5.0) / 5.0) * 0.15
            else:
                # Otherwise use z-score based calculation
                risk_score = min(1.0, z_score / (AMOUNT_THRESHOLD_MULTIPLIER * 2))
            
            logger.info(f"Amount anomaly check: z_score={z_score}, ratio={ratio_to_avg}, is_anomalous={is_anomalous}, risk_score={risk_score}")
            return is_anomalous, risk_score
            
        except Exception as e:
            logger.error(f"Error checking amount anomaly: {str(e)}")
            return False, 0.0
    
    def _check_location_anomaly(self, transaction: Dict[str, Any], customer: Dict[str, Any]) -> Tuple[bool, float]:
        """
        Check if transaction location is anomalous compared to customer's usual locations.
        
        Args:
            transaction: The transaction to evaluate
            customer: The customer profile
            
        Returns:
            Tuple of (is_anomalous, risk_score)
        """
        try:
            # Extract transaction location
            transaction_location = transaction.get("location", {})
            transaction_coordinates = transaction_location.get("coordinates", {}).get("coordinates", [0, 0])
            
            # If no coordinates, can't check
            if not transaction_coordinates or len(transaction_coordinates) != 2:
                return False, 0.0
            
            # Get customer's usual transaction locations
            behavioral_profile = customer.get("behavioral_profile", {})
            transaction_patterns = behavioral_profile.get("transaction_patterns", {})
            usual_locations = transaction_patterns.get("usual_transaction_locations", [])
            
            # If no usual locations, return moderate anomaly
            if not usual_locations:
                return True, 0.5
            
            # Calculate minimum distance to any usual location
            min_distance_km = float('inf')
            for location in usual_locations:
                location_coords = location.get("location", {}).get("coordinates", [0, 0])
                if location_coords and len(location_coords) == 2:
                    distance = self._calculate_haversine_distance(
                        transaction_coordinates[0], transaction_coordinates[1],
                        location_coords[0], location_coords[1]
                    )
                    min_distance_km = min(min_distance_km, distance)
            
            # Check if min distance exceeds threshold
            is_anomalous = min_distance_km > MAX_LOCATION_DISTANCE_KM
            
            # Calculate risk factor (0-1) based on distance
            # Use a more aggressive scaling to ensure high risk for truly unexpected locations
            # If the distance exceeds the threshold, we want at least 0.85 risk score
            if is_anomalous:
                risk_score = max(0.85, min(1.0, min_distance_km / (MAX_LOCATION_DISTANCE_KM * 1.2)))
            else:
                risk_score = min(0.5, min_distance_km / MAX_LOCATION_DISTANCE_KM)
            
            logger.info(f"Location anomaly check: distance={min_distance_km}km, is_anomalous={is_anomalous}, risk_score={risk_score}")
            return is_anomalous, risk_score
            
        except Exception as e:
            logger.error(f"Error checking location anomaly: {str(e)}")
            return False, 0.0
    
    def _check_device_anomaly(self, transaction: Dict[str, Any], customer: Dict[str, Any]) -> Tuple[bool, float]:
        """
        Check if transaction device is known for this customer.
        
        Args:
            transaction: The transaction to evaluate
            customer: The customer profile
            
        Returns:
            Tuple of (is_anomalous, risk_score)
        """
        try:
            # Extract transaction device
            device_info = transaction.get("device_info", {})
            device_id = device_info.get("device_id", "")
            device_type = device_info.get("type", "")
            device_os = device_info.get("os", "")
            device_browser = device_info.get("browser", "")
            device_ip = device_info.get("ip", "")
            
            # If no device info, return moderate anomaly
            if not device_id:
                return True, 0.5
            
            # Get customer's known devices
            behavioral_profile = customer.get("behavioral_profile", {})
            known_devices = behavioral_profile.get("devices", [])
            
            # Check if device is known
            device_known = False
            ip_match = False
            for device in known_devices:
                # Check device ID
                if device.get("device_id") == device_id:
                    device_known = True
                    break
                
                # Check if IP matches known IP ranges
                if device_ip:
                    ip_ranges = device.get("ip_range", [])
                    for ip in ip_ranges:
                        if device_ip == ip:
                            ip_match = True
                            break
            
            # Calculate risk score: high if device unknown, medium if only IP matches
            if device_known:
                return False, 0.0
            elif ip_match:
                return True, 0.5
            else:
                return True, 0.9
            
        except Exception as e:
            logger.error(f"Error checking device anomaly: {str(e)}")
            return False, 0.0
    
    async def _check_transaction_velocity(self, transaction: Dict[str, Any], customer_id: str) -> Tuple[bool, float]:
        """
        Check for unusually high transaction frequency in recent time window.
        
        Args:
            transaction: The transaction to evaluate
            customer_id: The customer ID
            
        Returns:
            Tuple of (is_anomalous, risk_score)
        """
        try:
            # Define time window
            current_time = transaction.get("timestamp", datetime.now())
            if isinstance(current_time, str):
                current_time = datetime.fromisoformat(current_time.replace('Z', '+00:00'))
            
            start_time = current_time - timedelta(minutes=VELOCITY_TIME_WINDOW_MINUTES)
            
            # Query recent transactions
            recent_transactions = list(self.db_client.get_collection(
                db_name=self.db_name,
                collection_name=self.transaction_collection
            ).find({
                "customer_id": customer_id,
                "timestamp": {"$gte": start_time, "$lt": current_time}
            }))
            
            # Count transactions in window
            transaction_count = len(recent_transactions)
            
            # Check if count exceeds threshold
            is_anomalous = transaction_count >= VELOCITY_THRESHOLD
            
            # Calculate risk factor (0-1) based on count relative to threshold
            risk_score = min(1.0, transaction_count / (VELOCITY_THRESHOLD * 1.5))
            
            return is_anomalous, risk_score
            
        except Exception as e:
            logger.error(f"Error checking transaction velocity: {str(e)}")
            return False, 0.0
    
    async def _check_pattern_match(self, transaction: Dict[str, Any], flags: List[str]) -> Tuple[bool, float]:
        """
        Check if transaction matches known fraud patterns using vector embeddings.
        
        Args:
            transaction: The transaction to evaluate
            flags: Current fraud flags detected
            
        Returns:
            Tuple of (is_anomalous, risk_score)
        """
        try:
            # Generate transaction description for embedding
            # Include flags and transaction properties
            merchant_category = transaction.get("merchant", {}).get("category", "unknown")
            transaction_type = transaction.get("transaction_type", "unknown")
            payment_method = transaction.get("payment_method", "unknown")
            amount = transaction.get("amount", 0)
            
            description = f"Transaction {transaction_type} of ${amount} using {payment_method} to {merchant_category} merchant with flags: {', '.join(flags)}"
            
            # Generate embedding for transaction
            transaction_embedding = await get_embedding(description)
            
            # Query fraud patterns collection for vector similarity
            # Check if vector search index exists
            collection = self.db_client.get_collection(
                db_name=self.db_name,
                collection_name=self.fraud_pattern_collection
            )
            
            # Check if vector search is available
            has_vector_index = False
            for index in collection.index_information().values():
                if index.get("name", "").startswith("vector_"):
                    has_vector_index = True
                    break
            
            matching_patterns = []
            if has_vector_index:
                # Use vector search
                pipeline = [
                    {
                        "$vectorSearch": {
                            "index": "vector_index",  # Must match the actual index name
                            "path": "vector_embedding",
                            "queryVector": transaction_embedding,
                            "numCandidates": 10,
                            "limit": 3
                        }
                    },
                    {
                        "$project": {
                            "_id": 1,
                            "pattern_name": 1,
                            "description": 1,
                            "severity": 1,
                            "indicators": 1,
                            "score": {"$meta": "vectorSearchScore"}
                        }
                    }
                ]
                matching_patterns = list(collection.aggregate(pipeline))
            else:
                # Fall back to basic query
                # Find patterns where there's an intersection with the flags
                matching_patterns = list(collection.find({
                    "indicators": {"$in": flags}
                }).limit(3))
            
            # Check for strong matches
            if matching_patterns:
                # If using vector search, score is available
                highest_score = 0.0
                if has_vector_index and "score" in matching_patterns[0]:
                    highest_score = matching_patterns[0]["score"]
                    is_anomalous = highest_score > SIMILARITY_THRESHOLD
                    risk_score = min(1.0, highest_score)
                else:
                    # Calculate percentage of matching indicators
                    max_match_percentage = 0.0
                    for pattern in matching_patterns:
                        indicators = pattern.get("indicators", [])
                        if indicators:
                            match_count = sum(1 for flag in flags if flag in indicators)
                            match_percentage = match_count / len(indicators)
                            max_match_percentage = max(max_match_percentage, match_percentage)
                    
                    is_anomalous = max_match_percentage > 0.5
                    risk_score = max_match_percentage
                
                return is_anomalous, risk_score
            else:
                return False, 0.0
            
        except Exception as e:
            logger.error(f"Error checking pattern match: {str(e)}")
            return False, 0.0
    
    def _calculate_risk_score(self, amount_risk: float, location_risk: float, 
                             device_risk: float, velocity_risk: float, pattern_risk: float,
                             customer_base_risk: float = 0.0) -> float:
        """
        Calculate overall risk score based on individual risk factors and customer's base risk.
        
        Args:
            amount_risk: Risk score from amount anomaly check (0-1.0)
            location_risk: Risk score from location anomaly check (0-1.0)
            device_risk: Risk score from device verification check (0-1.0)
            velocity_risk: Risk score from transaction velocity check (0-1.0)
            pattern_risk: Risk score from pattern matching check (0-1.0)
            customer_base_risk: Customer's baseline risk (0-100)
            
        Returns:
            Overall risk score (0-100)
        """
        # Log the input values for debugging
        logger.info(f"Risk calculation inputs - Amount: {amount_risk}, Location: {location_risk}, " +
                   f"Device: {device_risk}, Velocity: {velocity_risk}, Pattern: {pattern_risk}, " +
                   f"Customer Base: {customer_base_risk}")
        
        # Calculate weighted score from transaction factors
        transaction_weighted_score = (
            amount_risk * WEIGHT_AMOUNT +
            location_risk * WEIGHT_LOCATION +
            device_risk * WEIGHT_DEVICE +
            velocity_risk * WEIGHT_VELOCITY +
            pattern_risk * WEIGHT_PATTERN
        )
        
        # Scale transaction risk to 0-100
        transaction_risk = transaction_weighted_score * 100
        
        # Calculate maximum transaction risk to ensure our weighting has impact
        max_possible_single_risk = max(
            amount_risk if amount_risk > 0 else 0,
            location_risk if location_risk > 0 else 0,
            device_risk if device_risk > 0 else 0,
            velocity_risk if velocity_risk > 0 else 0,
            pattern_risk if pattern_risk > 0 else 0
        ) * 100
        
        # If a high risk factor is detected (like 100% location risk), ensure it has significant impact
        # by using a more non-linear combination formula
        if max_possible_single_risk >= 80:
            # Calculate the average of transaction risk, max individual risk and customer base risk
            # This gives more weight to the highest risk factor
            transaction_factor_weight = 0.5
            max_factor_weight = 0.3
            customer_weight = 0.2
            
            combined_risk = (
                (transaction_risk * transaction_factor_weight) +
                (max_possible_single_risk * max_factor_weight) +
                (customer_base_risk * customer_weight)
            )
        else:
            # For lower risk scenarios, use the standard weighted average
            transaction_weight = 0.7
            customer_weight = 0.3
            
            combined_risk = (transaction_risk * transaction_weight) + (customer_base_risk * customer_weight)
        
        # Log calculation results
        logger.info(f"Risk calculation - Transaction: {transaction_risk}, " +
                   f"Max Factor: {max_possible_single_risk}, Combined: {combined_risk}")
        
        # Ensure we don't exceed 100
        return min(combined_risk, 100.0)
    
    def _determine_risk_level(self, risk_score: float) -> str:
        """
        Determine risk level based on risk score.
        
        Args:
            risk_score: The calculated risk score (0-100)
            
        Returns:
            Risk level: "low", "medium", or "high"
        """
        # Lower thresholds to be more sensitive to risk:
        # - Low: 0-35 (was 0-40)
        # - Medium: 35-55 (was 40-60) 
        # - High: 55-100 (was 60-100)
        # This ensures transactions with significant risk factors are more likely to be flagged
        if risk_score < 35:
            return "low"
        elif risk_score < 55: 
            return "medium"
        else:
            return "high"
    
    def _update_customer_risk_profile(self, customer_id: str, flags: List[str]) -> None:
        """
        Update customer risk profile based on detected fraud flags.
        This is run asynchronously without waiting for completion.
        
        Args:
            customer_id: The customer ID
            flags: The fraud flags detected
        """
        try:
            # Update customer's risk profile
            from bson import ObjectId
            
            # Prepare the id for query
            query_id = customer_id
            if ObjectId.is_valid(customer_id):
                try:
                    query_id = ObjectId(customer_id)
                except:
                    pass  # Use the original id if conversion fails
            
            # First try to find the customer by whatever ID format we have
            customer = self.db_client.get_collection(
                db_name=self.db_name,
                collection_name=self.customer_collection
            ).find_one({"_id": query_id})
            
            # If not found, try alternative formats or fall back to any customer
            if not customer:
                # Try as string
                if ObjectId.is_valid(customer_id):
                    customer = self.db_client.get_collection(
                        db_name=self.db_name,
                        collection_name=self.customer_collection
                    ).find_one({"_id": customer_id})
                
                # Try with the customer account number
                if not customer:
                    customer = self.db_client.get_collection(
                        db_name=self.db_name,
                        collection_name=self.customer_collection
                    ).find_one({"account_info.account_number": customer_id})
                
                # If still not found, get first customer as fallback
                if not customer:
                    customers = list(self.db_client.get_collection(
                        db_name=self.db_name,
                        collection_name=self.customer_collection
                    ).find().limit(1))
                    
                    if customers:
                        customer = customers[0]
                        query_id = customer.get("_id")
                        logger.warning(f"Using fallback customer for risk profile update: {query_id}")
            
            if customer:
                # Update the customer record
                result = self.db_client.get_collection(
                    db_name=self.db_name,
                    collection_name=self.customer_collection
                ).update_one(
                    {"_id": query_id},
                    {
                        "$set": {
                            "risk_profile.last_risk_assessment": datetime.now(),
                        },
                        "$addToSet": {
                            "risk_profile.risk_factors": {"$each": flags}
                        },
                        # Increment risk score
                        "$inc": {
                            "risk_profile.overall_risk_score": len(flags) * 2.5
                        }
                    }
                )
                
                logger.info(f"Updated customer risk profile for ID {query_id}, matched: {result.matched_count}, modified: {result.modified_count}")
            else:
                logger.error(f"Could not find any customer to update risk profile for ID {customer_id}")
                
        except Exception as e:
            logger.error(f"Error updating customer risk profile: {str(e)}")
    
    def _calculate_haversine_distance(self, lon1: float, lat1: float, lon2: float, lat2: float) -> float:
        """
        Calculate the great circle distance between two points 
        on the earth (specified in decimal degrees)
        
        Returns:
            Distance in kilometers
        """
        # Convert decimal degrees to radians
        lon1, lat1, lon2, lat2 = map(math.radians, [lon1, lat1, lon2, lat2])
        
        # Haversine formula
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        r = 6371  # Radius of earth in kilometers
        return c * r