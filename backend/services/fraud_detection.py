import logging
import os
from typing import Dict, List, Any, Tuple, Optional
from datetime import datetime, timedelta, timezone
import math
from pymongo import MongoClient

from db.mongo_db import MongoDBAccess
from db.scope import scoped
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

# Written to riskProfile.components.activity.factors[] when a flag is raised. Existing
# factors on migrated customers use impacts of 10-70; 2.5 is used here because that is
# the actual per-flag contribution to the score (see the scale-mismatch note in
# _update_customer_risk_profile) rather than an invented weight.
FLAG_IMPACT = 2.5

FLAG_DESCRIPTIONS = {
    "unusual_amount": "Transaction amount deviates from the customer's historical pattern.",
    "unexpected_location": "Transaction originated outside the customer's usual locations.",
    "unknown_device": "Transaction used a device not seen on this customer before.",
    "velocity_alert": "Transaction count exceeded the customer's normal rate for the time window.",
    "matches_fraud_pattern": "Transaction matched a known fraud pattern.",
    "rare_transaction_time": "Transaction occurred outside the customer's usual hours.",
    "new_merchant_category": "Transaction used a merchant category new to this customer.",
    "customer_not_found": "No customer record matched the transaction's customer reference.",
}


class FraudDetectionService:
    """
    Service for detecting potentially fraudulent transactions using various detection strategies.
    """
    
    def __init__(self, db_client: MongoDBAccess, db_name: str = None):
        """
        Initialize the fraud detection service.
        
        Args:
            db_client: MongoDB client instance
            db_name: Database name to use (defaults to environment variable or "leafy_bank_bian")
        """
        self.db_client = db_client
        self.db_name = db_name or os.getenv("DB_NAME", "leafy_bank_bian")
        self.customer_collection = "customers"  # Updated to match the correct collection name
        self.transaction_collection = "transactions"
        self.fraud_pattern_collection = "threatsightFraudPatterns"
        
        logger.info(f"Initialized FraudDetectionService with database: {self.db_name}")
    
    def _find_customer(self, customer_id: str) -> Optional[Dict[str, Any]]:
        """Resolve a customer by its business id, or return None.

        `customer_id` is a `CUST-…` string (the simulator's picker reads this
        backend's own /customers/ route), so there is no ObjectId coercion and no
        `entities` lookup. The only fallback is an account number, which lives in
        `identifiers[]`.

        Returning None on a miss is deliberate. The previous implementation ended in
        `find().limit(1)` and scored the transaction against an arbitrary customer —
        a wrong answer that looked like a right one.
        """
        collection = self.db_client.get_collection(
            db_name=self.db_name,
            collection_name=self.customer_collection
        )

        customer = collection.find_one(scoped({"customerId": customer_id}))
        if not customer:
            customer = collection.find_one(scoped({"identifiers.value": customer_id}))

        if customer:
            logger.info(f"Resolved customer {customer_id}")
        else:
            logger.warning(f"No customer matched id {customer_id}")
        return customer

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
        
        customer = self._find_customer(customer_id)

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
            
        # Skip pattern matching since we're only using transaction-based vector search
        pattern_anomaly = False
        pattern_risk = 0.0
        
        # Get customer's baseline risk score
        customer_risk_score = 0.0
        try:
            overall = (customer or {}).get("riskProfile", {}).get("overall", {})
            if "score" in overall:
                customer_risk_score = float(overall["score"])
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
            behavioral_profile = customer.get("behavioralProfile", {})
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
            behavioral_profile = customer.get("behavioralProfile", {})
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
            behavioral_profile = customer.get("behavioralProfile", {})
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
            ).find(scoped({
                # stored field names; `transaction` above is the inbound request payload,
                # which keeps its snake_case wire names
                "payer.accountId": customer_id,
                "createdAt": {"$gte": start_time, "$lt": current_time}
            })))
            
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
            
            # Use the same text representation function that matches stored transaction embeddings
            description = self._create_transaction_text_representation_for_new(transaction)
            
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
                        # UNREACHABLE today: threatsightFraudPatterns has no vector index
                        # (deliberately not created — building one would enable a code path
                        # that has never run), so has_vector_index is always False and the
                        # basic-query branch below is what executes.
                        # `path` corrected to camelCase: on patterns the migration named the
                        # field vectorEmbedding, unlike transactions which kept the snake
                        # vector_embedding. Left correct so enabling the index later works.
                        "$vectorSearch": {
                            "index": "vector_index",  # no index of this name exists yet
                            "path": "vectorEmbedding",
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
                matching_patterns = list(collection.find(scoped({
                    "indicators": {"$in": flags}
                })).limit(3))
            
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
            
    async def find_similar_transactions(self, transaction: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], float, Dict]:
        """
        Find similar historical transactions using vector search.
        
        This method converts the current transaction to an embedding on-the-fly and
        performs a vector search against existing transactions in the database.
        
        Note: This method returns up to 15 similar transactions to allow for intelligent
        filtering at the API layer. The routes/transaction.py file handles smart filtering 
        to prioritize transactions by risk level (high/medium risk for unusual transactions, 
        low risk for normal transactions) for UI display.
        
        Args:
            transaction: The current transaction being evaluated
            
        Returns:
            Tuple of (similar_transactions_list, similarity_risk_score, calculation_breakdown)
            - similar_transactions_list: List of similar historical transactions
            - similarity_risk_score: Risk score based on similarity analysis (0.0-1.0)
            - calculation_breakdown: Detailed breakdown of calculation steps for transparency
        """
        try:
            # Extract transaction details
            merchant_category = transaction.get("merchant", {}).get("category", "unknown")
            transaction_type = transaction.get("transaction_type", "unknown")
            payment_method = transaction.get("payment_method", "unknown")
            amount = transaction.get("amount", 0)
            customer_id = transaction.get("customer_id")
            
            # Use the same text representation function for new transactions (excluding ID and risk fields)
            transaction_text = self._create_transaction_text_representation_for_new(transaction)
            
            # Generate embedding for the transaction using the consistent format
            transaction_embedding = await get_embedding(transaction_text)
            
            # Access the transactions collection
            collection = self.db_client.get_collection(
                db_name=self.db_name,
                collection_name=self.transaction_collection
            )
            
            # Skip checking for indexes and directly use the known vector index
            similar_transactions = []
            similarity_risk_score = 0.0
            
            # Perform vector search against ALL transactions without customer filtering
            pipeline = [
                {
                    "$vectorSearch": {
                        "index": "transaction_vector_index",  # Using the specified index name
                        "path": "vector_embedding",
                        "queryVector": transaction_embedding,
                        "numCandidates": 200,  # Cast an even wider net
                        "limit": 15  # Return top 15 matches for more comprehensive analysis
                    }
                },
                {
                    # The projection is the DB→wire boundary for this payload: it reads
                    # the migrated camelCase fields and emits the snake_case names the
                    # frontend renders (results.similar_transactions[*]). Renaming here
                    # rather than in the UI is what keeps D1(a) — wire stays snake.
                    "$project": {
                        "_id": 1,
                        "transaction_id": "$txnId",
                        "timestamp": "$createdAt",
                        "amount": 1,
                        "merchant": 1,
                        "transaction_type": "$transactionTypeSource",
                        "payment_method": "$paymentMethodSource",
                        "risk_assessment": "$riskAssessment",
                        "score": {"$meta": "vectorSearchScore"}
                    }
                }
            ]
            
            try:
                # Execute the vector search
                similar_transactions = list(collection.aggregate(pipeline))
                logger.info(f"Found {len(similar_transactions)} similar transactions with vector search")
                
                # Calculate a risk score based on the similarity results
                if similar_transactions:
                    # Get current transaction amount for amount comparisons
                    current_amount = transaction.get("amount", 0)
                    
                    # Score categories for different risk levels
                    high_risk_scores = []
                    medium_risk_scores = []
                    low_risk_scores = []
                    
                    # Process all transactions
                    for idx, t in enumerate(similar_transactions):
                        # Get the similarity score
                        similarity = t.get("score", 0.5)  # Default to 0.5 if not available
                        
                        # Apply position weight (earlier results have more impact)
                        # First 5 results maintain high weight, then gradually decrease
                        position_weight = 1.0 if idx < 5 else max(0.5, 1.0 - ((idx - 5) * 0.05))
                        weighted_similarity = similarity * position_weight
                        
                        # Get risk information
                        risk_assessment = t.get("risk_assessment", {})
                        risk_level = risk_assessment.get("level", "unknown")
                        risk_score = risk_assessment.get("score", 50) / 100.0  # Normalize to 0-1 range
                        transaction_type = risk_assessment.get("transaction_type", "unknown")
                        risk_flags = risk_assessment.get("flags", [])
                        
                        # Get amount for comparison
                        similar_amount = t.get("amount", 0)
                        
                        # Calculate amount similarity (if both amounts are valid)
                        amount_similarity = 1.0
                        if similar_amount > 0 and current_amount > 0:
                            # Calculate ratio of smaller to larger amount (gives 0.0-1.0)
                            amount_ratio = min(current_amount, similar_amount) / max(current_amount, similar_amount)
                            
                            # Strong weight for very similar amounts
                            if amount_ratio > 0.95:  # Very similar
                                amount_similarity = 1.0
                            elif amount_ratio > 0.8:  # Somewhat similar
                                amount_similarity = 0.8
                            elif amount_ratio > 0.5:  # Moderately different
                                amount_similarity = 0.6
                            else:  # Very different
                                amount_similarity = 0.4
                        
                        # Adjust similarity score based on amount
                        final_similarity = weighted_similarity * 0.7 + amount_similarity * 0.3
                        
                        # Create score object with relevant information
                        score_entry = {
                            "similarity": final_similarity,
                            "risk_score": risk_score,
                            "flags": len(risk_flags),
                            "transaction_id": t.get("transaction_id", "unknown")
                        }
                        
                        # Categorize by risk level
                        if risk_level == "high" or transaction_type == "fraudulent":
                            high_risk_scores.append(score_entry)
                        elif risk_level == "medium" or transaction_type == "suspicious":
                            medium_risk_scores.append(score_entry)
                        elif risk_level == "low" or transaction_type == "legitimate":
                            low_risk_scores.append(score_entry)
                        else:
                            # Put unknown in medium risk by default
                            medium_risk_scores.append(score_entry)
                            
                        # Log detailed info for debugging
                        logger.info(f"Match {idx}: similarity={similarity:.2f}, weighted={weighted_similarity:.2f}, " +
                                  f"amount_sim={amount_similarity:.2f}, final={final_similarity:.2f}, " +
                                  f"risk={risk_level}, flags={len(risk_flags)}")
                    
                    # Calculate final risk score based on the distribution of risks
                    # Strategy: prioritize high-risk matches, especially when they have high similarity
                    
                    # Initialize calculation breakdown for transparency
                    calculation_breakdown = {
                        "method": "",
                        "steps": [],
                        "high_risk_matches": len(high_risk_scores),
                        "medium_risk_matches": len(medium_risk_scores),
                        "low_risk_matches": len(low_risk_scores),
                        "total_matches": len(similar_transactions),
                        "components": {}
                    }
                    
                    if high_risk_scores:
                        calculation_breakdown["method"] = "High Risk Weighted Average"
                        
                        # With high risk matches, focus on them using weighted average
                        total_weight = 0
                        weighted_sum = 0
                        
                        calculation_breakdown["steps"].append("Step 1: Calculate weighted average of high-risk matches")
                        weight_details = []
                        
                        for i, score in enumerate(high_risk_scores):
                            # Higher similarity and more flags = higher weight
                            weight = score["similarity"] * (1 + score["flags"] * 0.1)
                            weighted_sum += score["risk_score"] * weight
                            total_weight += weight
                            
                            weight_details.append({
                                "match": i + 1,
                                "similarity": score["similarity"],
                                "flags": score["flags"],
                                "risk_score": score["risk_score"],
                                "weight": weight,
                                "contribution": score["risk_score"] * weight
                            })
                            
                        # Calculate weighted risk and add a premium for multiple high-risk matches
                        high_risk_factor = min(1.0, weighted_sum / max(1, total_weight))
                        high_risk_boost = min(0.2, len(high_risk_scores) * 0.05)  # Up to 0.2 boost for multiple matches
                        
                        calculation_breakdown["components"] = {
                            "weighted_average": high_risk_factor,
                            "multiple_match_boost": high_risk_boost,
                            "weight_details": weight_details,
                            "total_weighted_sum": weighted_sum,
                            "total_weight": total_weight
                        }
                        
                        calculation_breakdown["steps"].extend([
                            f"Step 2: Weighted Average = {weighted_sum:.4f} ÷ {total_weight:.4f} = {high_risk_factor:.4f}",
                            f"Step 3: Multiple Match Boost = min(0.2, {len(high_risk_scores)} × 0.05) = {high_risk_boost:.4f}",
                            f"Step 4: Final Score = {high_risk_factor:.4f} + {high_risk_boost:.4f} = {min(1.0, high_risk_factor + high_risk_boost):.4f}"
                        ])
                        
                        # Final high risk score with boost
                        similarity_risk_score = min(1.0, high_risk_factor + high_risk_boost)
                        
                    elif low_risk_scores and not medium_risk_scores:
                        calculation_breakdown["method"] = "Low Risk Inverse Calculation"
                        
                        # Only low risk matches - likely safe
                        
                        # Calculate average similarity to low-risk transactions
                        avg_similarity = sum(s["similarity"] for s in low_risk_scores) / len(low_risk_scores)
                        
                        calculation_breakdown["components"] = {
                            "average_similarity": avg_similarity,
                            "inverse_factor": avg_similarity ** 1.5,
                            "low_risk_matches": [{"similarity": s["similarity"], "risk_score": s["risk_score"]} for s in low_risk_scores]
                        }
                        
                        calculation_breakdown["steps"] = [
                            f"Step 1: Calculate average similarity to low-risk transactions",
                            f"Average Similarity = {avg_similarity:.4f}",
                            f"Step 2: Apply inverse relationship (high similarity to low-risk = lower risk)",
                            f"Inverse Factor = {avg_similarity:.4f}^1.5 = {avg_similarity ** 1.5:.4f}",
                            f"Step 3: Final Score = max(0.05, 1.0 - {avg_similarity ** 1.5:.4f}) = {max(0.05, 1.0 - (avg_similarity ** 1.5)):.4f}"
                        ]
                        
                        # Higher similarity to low-risk = lower risk score (inverse relationship)
                        # Use a curve that drops quickly with high similarity
                        similarity_risk_score = max(0.05, 1.0 - (avg_similarity ** 1.5))
                        
                    else:
                        calculation_breakdown["method"] = "Mixed Risk Weighted Average"
                        
                        # Mixed risk or medium risk - use weighted calculation across all scores
                        all_scores = high_risk_scores + medium_risk_scores + low_risk_scores
                        
                        if all_scores:
                            calculation_breakdown["steps"].append("Step 1: Calculate weighted average across all risk levels")
                            
                            # Calculate weighted average of all risk scores
                            total_weight = 0
                            weighted_sum = 0
                            weight_details = []
                            
                            for i, score in enumerate(all_scores):
                                # Balance between similarity and risk factors
                                weight = score["similarity"] * (1 + 0.2 * score["flags"])
                                weighted_sum += score["risk_score"] * weight
                                total_weight += weight
                                
                                weight_details.append({
                                    "match": i + 1,
                                    "similarity": score["similarity"],
                                    "flags": score["flags"],
                                    "risk_score": score["risk_score"],
                                    "weight": weight,
                                    "contribution": score["risk_score"] * weight
                                })
                                
                            # Normalize to get final score
                            if total_weight > 0:
                                similarity_risk_score = weighted_sum / total_weight
                                
                                calculation_breakdown["components"] = {
                                    "total_weighted_sum": weighted_sum,
                                    "total_weight": total_weight,
                                    "weight_details": weight_details
                                }
                                
                                calculation_breakdown["steps"].extend([
                                    f"Step 2: Final Score = {weighted_sum:.4f} ÷ {total_weight:.4f} = {similarity_risk_score:.4f}"
                                ])
                            else:
                                similarity_risk_score = 0.5
                                calculation_breakdown["components"] = {"fallback_reason": "No valid weights calculated"}
                                calculation_breakdown["steps"].append("Step 2: Using fallback score of 0.5 (no valid weights)")
                        else:
                            # Fallback if no categorized scores
                            similarity_risk_score = 0.5
                            calculation_breakdown["components"] = {"fallback_reason": "No categorized scores found"}
                            calculation_breakdown["steps"] = ["Using fallback score of 0.5 (no categorized scores)"]
                    
                    # Ensure the score is in bounds
                    similarity_risk_score = max(0.0, min(1.0, similarity_risk_score))
                    
                    # Log the final calculation
                    logger.info(f"Final similarity risk calculation: score={similarity_risk_score:.3f}, " +
                              f"high_risk_matches={len(high_risk_scores)}, " +
                              f"medium_risk_matches={len(medium_risk_scores)}, " +
                              f"low_risk_matches={len(low_risk_scores)}")
                    
                    logger.info(f"Calculated similarity risk score: {similarity_risk_score}")
                else:
                    # No similar transactions means this is very unique 
                    # This could be a risk if we have many transactions in the system
                    transaction_count = await self._get_total_transaction_count()
                    
                    calculation_breakdown = {
                        "method": "No Similar Transactions Found",
                        "steps": [],
                        "high_risk_matches": 0,
                        "medium_risk_matches": 0,
                        "low_risk_matches": 0,
                        "total_matches": 0,
                        "components": {"transaction_count": transaction_count}
                    }
                    
                    if transaction_count > 10:
                        # If we have a reasonable number of transactions but none similar
                        similarity_risk_score = 0.75  # Higher risk for unusual transaction
                        calculation_breakdown["steps"] = [
                            f"Total transactions in database: {transaction_count}",
                            "No similar transactions found despite having sufficient data",
                            "This indicates a highly unusual transaction pattern",
                            "Assigned high risk score: 0.75"
                        ]
                    else:
                        # Not enough transactions to make a judgment
                        similarity_risk_score = 0.5  # Moderate risk
                        calculation_breakdown["steps"] = [
                            f"Total transactions in database: {transaction_count}",
                            "Insufficient historical data for meaningful comparison",
                            "Assigned moderate risk score: 0.5"
                        ]
            
            except Exception as e:
                logger.error(f"Error in vector search against transactions: {str(e)}")
                # Log the error and return empty results with moderate risk
                logger.error(f"Error details: {str(e)}")
                logger.error(f"Attempted pipeline: {pipeline}")
                similarity_risk_score = 0.5  # Default to moderate risk on error
                
                calculation_breakdown = {
                    "method": "Error in Vector Search",
                    "steps": [
                        "An error occurred during vector search processing",
                        f"Error: {str(e)}",
                        "Assigned moderate risk score: 0.5 as fallback"
                    ],
                    "high_risk_matches": 0,
                    "medium_risk_matches": 0,
                    "low_risk_matches": 0,
                    "total_matches": 0,
                    "components": {"error": str(e)}
                }
            
            # Convert ObjectID to strings and format timestamps for JSON
            for t in similar_transactions:
                if "_id" in t:
                    t["_id"] = str(t["_id"])
                if "timestamp" in t and isinstance(t["timestamp"], datetime):
                    t["timestamp"] = t["timestamp"].isoformat()
            
            return similar_transactions, similarity_risk_score, calculation_breakdown
            
        except Exception as e:
            logger.error(f"Error finding similar transactions: {str(e)}")
            error_breakdown = {
                "method": "Exception in find_similar_transactions",
                "steps": [
                    f"Unexpected error: {str(e)}",
                    "Returned empty list and moderate risk score: 0.5"
                ],
                "high_risk_matches": 0,
                "medium_risk_matches": 0,
                "low_risk_matches": 0,
                "total_matches": 0,
                "components": {"error": str(e)}
            }
            return [], 0.5, error_breakdown  # Return empty list, moderate risk, and error breakdown
    
    async def _customer_has_transactions(self, customer_id: str) -> bool:
        """Check if a customer has any transaction history"""
        try:
            count = self.db_client.get_collection(
                db_name=self.db_name,
                collection_name=self.transaction_collection
            ).count_documents(scoped({"payer.accountId": customer_id}))
            return count > 0
        except Exception as e:
            logger.error(f"Error checking customer transactions: {str(e)}")
            return False
            
    async def _get_total_transaction_count(self) -> int:
        """Get the total count of transactions in the system"""
        try:
            count = self.db_client.get_collection(
                db_name=self.db_name,
                collection_name=self.transaction_collection
            ).count_documents(scoped())
            logger.info(f"Total transaction count in system: {count}")
            return count
        except Exception as e:
            logger.error(f"Error counting transactions: {str(e)}")
            return 0
            
    def _create_transaction_text_representation(self, transaction: Dict[str, Any]) -> str:
        """Create a text representation of a transaction for embedding
        
        This must match exactly how the original transaction embeddings were created.
        """
        # Format transaction details as text
        text = f"""
        Transaction ID: {transaction.get('transaction_id', 'N/A')}
        Amount: {transaction.get('amount', 0)} {transaction.get('currency', 'USD')}
        Merchant: {transaction.get('merchant', {}).get('name', 'N/A')}
        Merchant Category: {transaction.get('merchant', {}).get('category', 'N/A')}
        Transaction Type: {transaction.get('transaction_type', 'N/A')}
        Payment Method: {transaction.get('payment_method', 'N/A')}
        Location: {transaction.get('location', {}).get('city', 'N/A')}, {transaction.get('location', {}).get('state', 'N/A')}, {transaction.get('location', {}).get('country', 'N/A')}
        Device: {transaction.get('device_info', {}).get('type', 'N/A')}, {transaction.get('device_info', {}).get('os', 'N/A')}, {transaction.get('device_info', {}).get('browser', 'N/A')}
        """
        
        # Add risk assessment information if available
        if 'risk_assessment' in transaction:
            risk = transaction['risk_assessment']
            flags_text = ', '.join(risk.get('flags', [])) if risk.get('flags', []) else 'None'
            
            text += f"""
            Risk Score: {risk.get('score', 0)}
            Risk Level: {risk.get('level', 'N/A')}
            Risk Flags: {flags_text}
            """
        
        return text
    
    def _create_transaction_text_representation_for_new(self, transaction: Dict[str, Any]) -> str:
        """Create a text representation of a NEW transaction for embedding
        
        This excludes Transaction ID and risk assessment fields since they don't exist yet.
        Must match the format used for stored transaction embeddings.
        """
        # Format transaction details as text (excluding ID and risk fields)
        text = f"""
        Amount: {transaction.get('amount', 0)} {transaction.get('currency', 'USD')}
        Merchant: {transaction.get('merchant', {}).get('name', 'N/A')}
        Merchant Category: {transaction.get('merchant', {}).get('category', 'N/A')}
        Transaction Type: {transaction.get('transaction_type', 'N/A')}
        Payment Method: {transaction.get('payment_method', 'N/A')}
        Location: {transaction.get('location', {}).get('city', 'N/A')}, {transaction.get('location', {}).get('state', 'N/A')}, {transaction.get('location', {}).get('country', 'N/A')}
        Device: {transaction.get('device_info', {}).get('type', 'N/A')}, {transaction.get('device_info', {}).get('os', 'N/A')}, {transaction.get('device_info', {}).get('browser', 'N/A')}
        """
        
        return text.strip()
    
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

        Writes into the `riskProfile` sub-tree only. Writing the legacy snake
        `risk_profile.*` here would create a second, divergent risk record alongside
        `riskProfile` on the same document — two answers, no error.

        Args:
            customer_id: The customer ID
            flags: The fraud flags detected
        """
        if not flags:
            return

        try:
            # Same single-path resolution the read side uses. A miss is an error, not
            # a cue to update an arbitrary customer's risk profile.
            customer = self._find_customer(customer_id)

            if not customer:
                logger.error(f"Could not find customer {customer_id} to update risk profile")
                return

            risk_profile = customer.get("riskProfile") or {}
            current_score = float((risk_profile.get("overall") or {}).get("score") or 0.0)

            # NOTE: pre-existing scale mismatch, carried over deliberately rather than
            # silently rescaled. `len(flags) * 2.5` spans 0-12.5, but
            # riskProfile.overall.score is a 0-100 scale. Five flags therefore move the
            # score by 12.5 points, not to 12.5. Raise with the data-model owner before
            # changing the formula.
            new_score = max(0.0, min(100.0, current_score + len(flags) * 2.5))
            new_level = self._determine_risk_level(new_score)
            # Customer dates are stored as ISO strings (not BSON dates), and the migrated
            # values are UTC with a trailing Z. A naive local timestamp in the same field
            # would break ordering, so match the stored format exactly.
            assessed_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

            # `activity` is the only component with no factors on any migrated customer,
            # and every flag this service raises is an activity signal.
            factors = [
                {
                    "type": flag,
                    "impact": FLAG_IMPACT,
                    "description": FLAG_DESCRIPTIONS.get(flag, f"Transaction flagged: {flag}."),
                }
                for flag in flags
            ]

            result = self.db_client.get_collection(
                db_name=self.db_name,
                collection_name=self.customer_collection
            ).update_one(
                scoped({"_id": customer["_id"]}),
                {
                    "$set": {
                        "riskProfile.assessedAt": assessed_at,
                        # score and level are siblings; updating one alone leaves the
                        # document self-contradictory. `trend` is left untouched — its
                        # direction is ambiguous and it is an open data-model question.
                        "riskProfile.overall.score": new_score,
                        "riskProfile.overall.level": new_level,
                    },
                    "$addToSet": {
                        "riskProfile.components.activity.factors": {"$each": factors}
                    },
                    "$push": {
                        "riskProfile.history": {
                            "date": assessed_at,
                            "score": new_score,
                            "level": new_level,
                            # New enum value: migrated customers carry only
                            # "initial_assessment". The canonical spec's validator does
                            # not constrain changeTrigger, so nothing rejects it, but it
                            # needs adding to the spec's documented values.
                            "changeTrigger": "transaction_assessment",
                        }
                    },
                }
            )

            logger.info(
                f"Updated riskProfile for {customer_id}: {current_score} -> {new_score} "
                f"({new_level}), {len(factors)} activity factor(s); "
                f"matched={result.matched_count}, modified={result.modified_count}"
            )

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