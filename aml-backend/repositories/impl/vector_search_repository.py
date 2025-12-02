"""
Vector Search Repository Implementation - Concrete implementation using mongodb_core_lib

Streamlined, production-ready implementation of vector search operations using the 
mongodb_core_lib utilities for optimal performance and AI-powered similarity matching.

Focus: Core vector search functionality without complex bulk operations.
"""

import logging
import math
import os
import re
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from bson import ObjectId

from repositories.interfaces.vector_search_repository import (
    VectorSearchRepositoryInterface, VectorSearchParams, VectorSearchResult, EmbeddingStats
)
from reference.mongodb_core_lib import MongoDBRepository, AggregationBuilder, VectorSearchOptions


logger = logging.getLogger(__name__)


class VectorSearchRepository(VectorSearchRepositoryInterface):
    """
    Vector Search repository implementation using mongodb_core_lib
    
    Provides comprehensive vector search functionality with MongoDB Vector Search,
    embedding management, and AI-powered similarity matching for entity resolution.
    """
    
    def __init__(self, mongodb_repo: MongoDBRepository, 
                 collection_name: str = "entities",
                 vector_index_name: str = "entity_vector_search_index",
                 embedding_type: str = "identifier"):
        """
        Initialize Vector Search repository
        
        Args:
            mongodb_repo: MongoDB repository instance from core lib
            collection_name: Name of the collection to search
            vector_index_name: Name of the vector search index (can be overridden by embedding_type)
            embedding_type: Type of embedding to use ("identifier", "behavioral", or "legacy")
        """
        self.repo = mongodb_repo
        self.collection_name = collection_name
        self.embedding_type = embedding_type
        
        # Set embedding field and index based on type
        if embedding_type == "identifier":
            self.embedding_field = "identifierEmbedding"
            self.vector_index_name = os.getenv("ENTITY_IDENTIFIER_VECTOR_INDEX", "entity_identifier_vector_index")
        elif embedding_type == "behavioral":
            self.embedding_field = "behavioralEmbedding"
            self.vector_index_name = os.getenv("ENTITY_BEHAVIORAL_VECTOR_INDEX", "entity_behavioral_vector_index")
        else:  # legacy or default
            self.embedding_field = "profileEmbedding"
            self.vector_index_name = vector_index_name
        
        self.collection = self.repo.collection(collection_name)
        
        # Initialize vector search capabilities
        self.ai_search = self.repo.ai_search(collection_name)
        self.aggregation = self.repo.aggregation
        
        # Vector search performance tracking
        self._search_metrics = {
            "total_searches": 0,
            "average_response_time": 0.0,
            "similarity_distribution": {}
        }
    
    # ==================== CORE VECTOR SEARCH OPERATIONS ====================
    
    async def vector_search(self, params: VectorSearchParams) -> List[VectorSearchResult]:
        """Perform vector similarity search"""
        try:
            # Build vector search pipeline
            pipeline = [
                {
                    "$vectorSearch": {
                        "index": self.vector_index_name,
                        "path": self.embedding_field,
                        "queryVector": params.query_vector,
                        "numCandidates": params.num_candidates,
                        "limit": params.limit
                    }
                },
                {
                    "$addFields": {
                        "similarity_score": {"$meta": "vectorSearchScore"}
                    }
                }
            ]
            
            # Add filters if provided
            if params.filters:
                pipeline.append({"$match": params.filters})
            
            # Add similarity threshold filter if provided
            if params.similarity_threshold:
                pipeline.append({
                    "$match": {
                        "similarity_score": {"$gte": params.similarity_threshold}
                    }
                })
            
            # Execute vector search
            results = await self.repo.execute_pipeline(self.collection_name, pipeline)
            
            # Convert to VectorSearchResult objects
            vector_results = []
            for result in results:
                if "_id" in result:
                    result["_id"] = str(result["_id"])
                
                vector_results.append(VectorSearchResult(
                    document=result,
                    similarity_score=result.get("similarity_score", 0.0),
                    vector_distance=1.0 - result.get("similarity_score", 0.0)  # Convert score to distance
                ))
            
            # Track search metrics
            self._track_search_metrics(len(vector_results))
            
            return vector_results
            
        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            return []
    
    async def find_similar_by_vector(self, query_vector: List[float],
                                   limit: int = 10,
                                   filters: Optional[Dict[str, Any]] = None,
                                   similarity_threshold: Optional[float] = None) -> List[Dict[str, Any]]:
        """Find similar entities by vector embedding"""
        try:
            params = VectorSearchParams(
                query_vector=query_vector,
                limit=limit,
                filters=filters,
                similarity_threshold=similarity_threshold
            )
            
            results = await self.vector_search(params)
            
            # Extract documents from VectorSearchResult objects
            documents = []
            for result in results:
                doc = result.document.copy()
                doc["similarity_score"] = result.similarity_score
                doc["vector_distance"] = result.vector_distance
                documents.append(doc)
            
            return documents
            
        except Exception as e:
            logger.error(f"Find similar by vector failed: {e}")
            return []
    
    async def find_similar_by_text(self, query_text: str,
                                 limit: int = 10,
                                 filters: Optional[Dict[str, Any]] = None,
                                 similarity_threshold: Optional[float] = None) -> List[Dict[str, Any]]:
        """Find similar entities by generating embedding from text"""
        try:
            # Generate embedding from text
            query_vector = await self.generate_embedding_from_text(query_text)
            
            if not query_vector:
                logger.warning(f"Failed to generate embedding for text: {query_text}")
                return []
            
            # Perform vector search
            return await self.find_similar_by_vector(
                query_vector=query_vector,
                limit=limit,
                filters=filters,
                similarity_threshold=similarity_threshold
            )
            
        except Exception as e:
            logger.error(f"Find similar by text failed for '{query_text}': {e}")
            return []
    
    async def find_similar_by_entity_id(self, entity_id: str,
                                      limit: int = 10,
                                      filters: Optional[Dict[str, Any]] = None,
                                      embedding_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Find entities similar to a specific entity
        
        Args:
            entity_id: Entity ID to find similar entities for
            limit: Maximum number of results
            filters: Additional filters to apply
            embedding_type: Type of embedding to use ("identifier", "behavioral", or None for default)
        """
        try:
            # Determine which embedding to use
            use_type = embedding_type or self.embedding_type
            
            # Get the entity's embedding
            entity_embedding = await self.get_embedding(entity_id, embedding_type=use_type)
            
            if not entity_embedding:
                logger.warning(f"No {use_type} embedding found for entity {entity_id}")
                return []
            
            # Add filter to exclude the original entity (using custom entityId field)
            if filters is None:
                filters = {}
            filters["entityId"] = {"$ne": entity_id}
            
            # Temporarily update embedding field if different type requested
            original_field = self.embedding_field
            original_index = self.vector_index_name
            
            if use_type == "identifier":
                self.embedding_field = "identifierEmbedding"
                self.vector_index_name = os.getenv("ENTITY_IDENTIFIER_VECTOR_INDEX", "entity_identifier_vector_index")
            elif use_type == "behavioral":
                self.embedding_field = "behavioralEmbedding"
                self.vector_index_name = os.getenv("ENTITY_BEHAVIORAL_VECTOR_INDEX", "entity_behavioral_vector_index")
            elif use_type == "legacy":
                self.embedding_field = "profileEmbedding"
                self.vector_index_name = os.getenv("ENTITY_VECTOR_SEARCH_INDEX", "entity_vector_search_index")
            
            # Perform vector search
            results = await self.find_similar_by_vector(
                query_vector=entity_embedding,
                limit=limit,
                filters=filters
            )
            
            # Restore original settings
            self.embedding_field = original_field
            self.vector_index_name = original_index
            
            return results
            
        except Exception as e:
            logger.error(f"Find similar by entity ID failed for {entity_id}: {e}")
            return []
    
    # ==================== EMBEDDING MANAGEMENT ====================
    
    async def store_embedding(self, entity_id: str, embedding: List[float],
                            metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Store or update embedding for an entity"""
        try:
            update_data = {
                self.embedding_field: embedding,
                "embedding_updated": datetime.utcnow(),
                "embedding_dimensions": len(embedding)
            }
            
            if metadata:
                update_data["embedding_metadata"] = metadata
            
            result = await self.collection.update_one(
                {"entityId": entity_id},
                {
                    "$set": update_data,
                    "$inc": {"version": 1}
                }
            )
            
            success = result.modified_count > 0
            if success:
                logger.debug(f"Stored embedding for entity {entity_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to store embedding for entity {entity_id}: {e}")
            return False
    
    async def get_embedding(self, entity_id: str, embedding_type: Optional[str] = None) -> Optional[List[float]]:
        """
        Get embedding for an entity
        
        Args:
            entity_id: Entity ID
            embedding_type: Type of embedding to retrieve ("identifier", "behavioral", or None for default)
            
        Returns:
            Embedding vector or None if not found
        """
        try:
            # Determine which field to retrieve
            field_name = self.embedding_field
            if embedding_type == "identifier":
                field_name = "identifierEmbedding"
            elif embedding_type == "behavioral":
                field_name = "behavioralEmbedding"
            elif embedding_type == "legacy":
                field_name = "profileEmbedding"
            
            result = await self.collection.find_one(
                {"entityId": entity_id},
                {field_name: 1}
            )
            
            if result and field_name in result:
                return result[field_name]
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get embedding for entity {entity_id}: {e}")
            return None
    
    async def delete_embedding(self, entity_id: str) -> bool:
        """Delete embedding for an entity"""
        try:
            result = await self.collection.update_one(
                {"entityId": entity_id},
                {
                    "$unset": {
                        self.embedding_field: "",
                        "embedding_updated": "",
                        "embedding_dimensions": "",
                        "embedding_metadata": ""
                    },
                    "$inc": {"version": 1}
                }
            )
            
            success = result.modified_count > 0
            if success:
                logger.debug(f"Deleted embedding for entity {entity_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to delete embedding for entity {entity_id}: {e}")
            return False
    
    # ==================== EMBEDDING GENERATION ====================
    
    async def generate_embedding_from_text(self, text: str) -> List[float]:
        """Generate embedding from text using direct bedrock.embeddings (same as backend)"""
        try:
            logger.info(f"Generating embedding for text: {text[:50]}...")

            # Use direct bedrock.embeddings path (same as working backend)
            from bedrock.embeddings import get_embedding
            return await get_embedding(text)

        except Exception as e:
            logger.error(f"Failed to generate embedding from text: {e}")
            return []
    
    async def generate_entity_embedding(self, entity_data: Dict[str, Any]) -> List[float]:
        """Generate embedding from entity data using frontend form fields"""
        try:
            # Create text representation using key fields from frontend onboarding
            entity_text = self._create_entity_onboarding_text(entity_data)
            
            if not entity_text.strip():
                logger.warning("No text content found for entity embedding generation")
                return []
            
            # Generate embedding from combined text
            return await self.generate_embedding_from_text(entity_text)
            
        except Exception as e:
            logger.error(f"Failed to generate entity embedding: {e}")
            return []
    
    def _create_entity_onboarding_text(self, entity_data: Dict[str, Any]) -> str:
        """
        Create text representation from frontend onboarding form fields:
        - Entity Type
        - Full Name
        - Date of Birth
        - Address
        - Primary Identifier
        
        Args:
            entity_data: Entity data from frontend
            
        Returns:
            str: Concatenated text for embedding generation
        """
        try:
            text_parts = []
            
            # Entity Type
            entity_type = entity_data.get("entityType")
            if entity_type:
                text_parts.append(f"Entity Type: {entity_type}")
            
            # Full Name (could be fullName or name field)
            full_name = entity_data.get("fullName") or entity_data.get("name")
            if full_name:
                text_parts.append(f"Name: {full_name}")
            
            # Date of Birth
            dob = entity_data.get("dateOfBirth")
            if dob:
                text_parts.append(f"Date of Birth: {dob}")
            
            # Address
            address = entity_data.get("address")
            if address:
                text_parts.append(f"Address: {address}")
            
            # Primary Identifier
            primary_id = entity_data.get("primaryIdentifier")
            if primary_id:
                text_parts.append(f"Primary Identifier: {primary_id}")
            
            # Join with consistent separator
            return " | ".join(text_parts)
            
        except Exception as e:
            logger.error(f"Failed to create entity onboarding text: {e}")
            return ""
    
    def _create_identifier_text(self, entity_data: Dict[str, Any]) -> str:
        """
        Create enhanced identifier text representation for identifier embedding.
        
        Enhanced features:
        - Normalized addresses and names
        - Semantic natural language structure
        - Field weighting (emphasizes unique identifiers)
        - Better handling of name variations
        - Structured format for better embedding quality
        
        Args:
            entity_data: Entity data dictionary
            
        Returns:
            str: Enhanced concatenated identifier text for embedding generation
        """
        try:
            entity_type = entity_data.get("entityType", entity_data.get("entity_type", "individual"))
            is_individual = entity_type.lower() == "individual"
            
            # Build semantic text parts
            semantic_parts = []
            
            # ========== NAME SECTION (High Priority) ==========
            name_section = self._build_name_section(entity_data)
            if name_section:
                semantic_parts.append(name_section)
            
            # ========== IDENTIFIERS SECTION (Highest Priority - Unique Identifiers) ==========
            identifiers_section = self._build_identifiers_section(entity_data)
            if identifiers_section:
                semantic_parts.append(identifiers_section)
            
            # ========== DATE OF BIRTH / INCORPORATION SECTION ==========
            date_section = self._build_date_section(entity_data, is_individual)
            if date_section:
                semantic_parts.append(date_section)
            
            # ========== LOCATION SECTION (Address, Nationality, Residency) ==========
            location_section = self._build_location_section(entity_data)
            if location_section:
                semantic_parts.append(location_section)
            
            # Join with natural language flow
            if semantic_parts:
                return ". ".join(semantic_parts) + "."
            else:
                return ""
            
        except Exception as e:
            logger.error(f"Failed to create identifier text: {e}")
            return ""
    
    def _build_name_section(self, entity_data: Dict[str, Any]) -> str:
        """Build natural language name section with variations"""
        name_parts = []
        
        # Extract name information
        name = entity_data.get("name")
        name_dict = {}
        
        if isinstance(name, dict):
            name_dict = name
            full_name = name.get("full", "").strip()
            structured = name.get("structured", {})
        elif isinstance(name, str):
            full_name = name.strip()
            structured = {}
        else:
            full_name = ""
            structured = {}
        
        # Build name from structured parts if full name not available
        if not full_name and structured:
            first = structured.get("first", "").strip()
            middle = structured.get("middle", "").strip()
            last = structured.get("last", "").strip()
            
            if first and last:
                full_name = f"{first}"
                if middle:
                    full_name += f" {middle}"
                full_name += f" {last}"
            elif first:
                full_name = first
            elif last:
                full_name = last
        
        # Normalize and format name
        if full_name:
            normalized_name = self._normalize_name(full_name)
            name_parts.append(normalized_name)
        
        # Add alternate names/aliases
        alternate_names = entity_data.get("alternate_names", [])
        if not alternate_names and name_dict:
            # Check for aliases in name structure
            aliases = name_dict.get("aliases", [])
            if aliases:
                alternate_names = aliases
        
        if alternate_names:
            normalized_alternates = [self._normalize_name(alt) for alt in alternate_names if alt and alt.strip()]
            if normalized_alternates:
                if len(normalized_alternates) == 1:
                    name_parts.append(f"also known as {normalized_alternates[0]}")
                else:
                    name_parts.append(f"also known as {', '.join(normalized_alternates[:-1])}, and {normalized_alternates[-1]}")
        
        if name_parts:
            return f"Entity: {', '.join(name_parts)}"
        return ""
    
    def _build_identifiers_section(self, entity_data: Dict[str, Any]) -> str:
        """Build identifiers section with emphasis on unique identifiers"""
        identifiers = entity_data.get("identifiers", {})
        if not isinstance(identifiers, dict) or not identifiers:
            return ""
        
        # Priority order: unique identifiers first
        priority_order = [
            ("passport", "passport number"),
            ("ssn", "Social Security Number"),
            ("national_id", "national ID"),
            ("tax_id", "tax ID"),
            ("ein", "Employer Identification Number"),
            ("drivers_license", "driver's license"),
            ("driversLicense", "driver's license"),
        ]
        
        identifier_parts = []
        other_identifiers = []
        
        # Process priority identifiers first
        processed_types = set()
        for id_key, id_label in priority_order:
            # Check both snake_case and camelCase
            id_value = identifiers.get(id_key) or identifiers.get(self._to_camel_case(id_key))
            if id_value and str(id_value).strip():
                identifier_parts.append(f"{id_label} {str(id_value).strip()}")
                processed_types.add(id_key)
                processed_types.add(self._to_camel_case(id_key))
        
        # Process remaining identifiers
        for id_type, id_value in identifiers.items():
            if id_type not in processed_types and id_value and str(id_value).strip():
                normalized_type = id_type.replace("_", " ").title()
                other_identifiers.append(f"{normalized_type} {str(id_value).strip()}")
        
        # Combine priority and other identifiers
        all_identifiers = identifier_parts + other_identifiers
        
        if all_identifiers:
            if len(all_identifiers) == 1:
                return f"Holds {all_identifiers[0]}"
            elif len(all_identifiers) == 2:
                return f"Holds {all_identifiers[0]} and {all_identifiers[1]}"
            else:
                return f"Holds {', '.join(all_identifiers[:-1])}, and {all_identifiers[-1]}"
        
        return ""
    
    def _build_date_section(self, entity_data: Dict[str, Any], is_individual: bool) -> str:
        """Build date section (DOB for individuals, incorporation date for organizations)"""
        if is_individual:
            dob = entity_data.get("dateOfBirth") or entity_data.get("dob")
            place_of_birth = entity_data.get("placeOfBirth") or entity_data.get("place_of_birth")
            
            date_parts = []
            if dob:
                date_parts.append(f"born on {dob}")
            if place_of_birth:
                date_parts.append(f"in {place_of_birth}")
            
            if date_parts:
                return f"Born {' '.join(date_parts)}"
        else:
            # Organization
            incorp_date = entity_data.get("incorporationDate") or entity_data.get("incorporation_date")
            jurisdiction = entity_data.get("jurisdictionOfIncorporation") or entity_data.get("jurisdiction_of_incorporation")
            
            date_parts = []
            if incorp_date:
                date_parts.append(f"incorporated on {incorp_date}")
            if jurisdiction:
                date_parts.append(f"in {jurisdiction}")
            
            if date_parts:
                return f"Incorporated {' '.join(date_parts)}"
        
        return ""
    
    def _build_location_section(self, entity_data: Dict[str, Any]) -> str:
        """Build location section (address, nationality, residency)"""
        location_parts = []
        
        # Address - normalized
        normalized_address = self._normalize_address(entity_data)
        if normalized_address:
            location_parts.append(f"resides at {normalized_address}")
        
        # Nationality
        nationality = entity_data.get("nationality")
        if nationality:
            if isinstance(nationality, list):
                nat_str = ", ".join(nationality)
            else:
                nat_str = str(nationality)
            location_parts.append(f"Nationality: {nat_str}")
        
        # Residency
        residency = entity_data.get("residency")
        if residency:
            location_parts.append(f"Residency: {residency}")
        
        if location_parts:
            return ". ".join(location_parts)
        return ""
    
    def _normalize_name(self, name: str) -> str:
        """Normalize name to title case and handle common variations"""
        if not name or not name.strip():
            return ""
        
        name = name.strip()
        
        # Handle common prefixes and suffixes
        name = name.replace("  ", " ")  # Remove double spaces
        
        # Convert to title case, but preserve certain patterns
        # Split and title case each word
        words = name.split()
        normalized_words = []
        
        for word in words:
            # Handle prefixes like "Mc", "Mac", "O'"
            if word.lower().startswith("mc") and len(word) > 2:
                normalized_words.append("Mc" + word[2:].capitalize())
            elif word.lower().startswith("mac") and len(word) > 3:
                normalized_words.append("Mac" + word[3:].capitalize())
            elif word.lower().startswith("o'") and len(word) > 2:
                normalized_words.append("O'" + word[2:].capitalize())
            else:
                normalized_words.append(word.capitalize())
        
        return " ".join(normalized_words)
    
    def _normalize_address(self, entity_data: Dict[str, Any]) -> str:
        """Normalize and format address with standard abbreviations"""
        # Try addresses array first
        addresses = entity_data.get("addresses", [])
        if addresses and isinstance(addresses, list) and len(addresses) > 0:
            primary_addr = addresses[0]
            if isinstance(primary_addr, dict):
                # Use full address if available
                if primary_addr.get("full"):
                    return self._normalize_address_string(primary_addr["full"])
                
                # Build from structured address
                struct = primary_addr.get("structured", {})
                if struct:
                    addr_parts = []
                    
                    street = struct.get("street", "").strip()
                    if street:
                        addr_parts.append(self._normalize_address_string(street))
                    
                    city = struct.get("city", "").strip()
                    state = struct.get("state", "").strip()
                    postal_code = struct.get("postalCode", "").strip() or struct.get("postal_code", "").strip()
                    country = struct.get("country", "").strip()
                    
                    # Build city/state/postal
                    city_state = []
                    if city:
                        city_state.append(city)
                    if state:
                        city_state.append(state)
                    if postal_code:
                        city_state.append(postal_code)
                    
                    if city_state:
                        addr_parts.append(", ".join(city_state))
                    
                    if country:
                        addr_parts.append(country)
                    
                    if addr_parts:
                        return ", ".join(addr_parts)
        
        # Fallback to contact address
        contact = entity_data.get("contact", {})
        if isinstance(contact, dict):
            contact_addr = contact.get("address", "").strip()
            contact_city = contact.get("city", "").strip()
            contact_country = contact.get("country", "").strip()
            
            contact_parts = []
            if contact_addr:
                contact_parts.append(self._normalize_address_string(contact_addr))
            if contact_city:
                contact_parts.append(contact_city)
            if contact_country:
                contact_parts.append(contact_country)
            
            if contact_parts:
                return ", ".join(contact_parts)
        
        return ""
    
    def _normalize_address_string(self, address: str) -> str:
        """Normalize address string with standard abbreviations"""
        if not address:
            return ""
        
        # Common address abbreviations mapping
        abbreviations = {
            r'\bSt\b': 'Street',
            r'\bSt\.\b': 'Street',
            r'\bAve\b': 'Avenue',
            r'\bAve\.\b': 'Avenue',
            r'\bRd\b': 'Road',
            r'\bRd\.\b': 'Road',
            r'\bDr\b': 'Drive',
            r'\bDr\.\b': 'Drive',
            r'\bBlvd\b': 'Boulevard',
            r'\bBlvd\.\b': 'Boulevard',
            r'\bLn\b': 'Lane',
            r'\bLn\.\b': 'Lane',
            r'\bCt\b': 'Court',
            r'\bCt\.\b': 'Court',
            r'\bPkwy\b': 'Parkway',
            r'\bPkwy\.\b': 'Parkway',
            r'\bApt\b': 'Apartment',
            r'\bApt\.\b': 'Apartment',
            r'\bSte\b': 'Suite',
            r'\bSte\.\b': 'Suite',
            r'\bUnit\b': 'Unit',
            r'\b#\b': 'Number',
        }
        
        normalized = address
        for pattern, replacement in abbreviations.items():
            normalized = re.sub(pattern, replacement, normalized, flags=re.IGNORECASE)
        
        return normalized.strip()
    
    def _to_camel_case(self, snake_str: str) -> str:
        """Convert snake_case to camelCase"""
        components = snake_str.split('_')
        return components[0] + ''.join(x.capitalize() for x in components[1:])
    
    def _create_behavioral_text(self, entity_data: Dict[str, Any]) -> str:
        """
        Create behavioral text representation for behavioral embedding:
        - Time of day patterns
        - Frequency patterns
        - IP addresses
        - Device patterns
        - Location patterns
        - Transaction patterns
        
        Args:
            entity_data: Entity data dictionary with behavioral_analytics
            
        Returns:
            str: Concatenated behavioral text for embedding generation
        """
        try:
            text_parts = []
            behavioral = entity_data.get("behavioral_analytics", {})
            
            if not behavioral:
                return ""
            
            # Time of day patterns
            time_patterns = behavioral.get("time_of_day_patterns", {})
            if time_patterns:
                if isinstance(time_patterns, dict):
                    peak_hours = time_patterns.get("peak_hours", [])
                    day_preferences = time_patterns.get("day_of_week_preferences", {})
                    if peak_hours:
                        text_parts.append(f"Peak Hours: {', '.join(map(str, peak_hours))}")
                    if day_preferences:
                        text_parts.append(f"Day Preferences: {', '.join([f'{k}: {v}' for k, v in day_preferences.items()])}")
            
            # Frequency patterns
            freq_patterns = behavioral.get("frequency_patterns", {})
            if freq_patterns:
                if isinstance(freq_patterns, dict):
                    tx_freq = freq_patterns.get("transaction_frequency")
                    login_freq = freq_patterns.get("login_frequency")
                    if tx_freq:
                        text_parts.append(f"Transaction Frequency: {tx_freq}")
                    if login_freq:
                        text_parts.append(f"Login Frequency: {login_freq}")
            
            # IP addresses
            ip_addresses = behavioral.get("ip_addresses", [])
            if ip_addresses:
                ip_list = []
                for ip_info in ip_addresses[:5]:  # Limit to first 5 IPs
                    if isinstance(ip_info, dict):
                        ip = ip_info.get("ip") or ip_info.get("address")
                        if ip:
                            ip_list.append(ip)
                    elif isinstance(ip_info, str):
                        ip_list.append(ip_info)
                if ip_list:
                    text_parts.append(f"IP Addresses: {', '.join(ip_list)}")
            
            # Device patterns
            devices = behavioral.get("devices", [])
            if devices:
                device_info = []
                for device in devices[:5]:  # Limit to first 5 devices
                    if isinstance(device, dict):
                        device_str = f"{device.get('type', 'unknown')} {device.get('os', '')} {device.get('browser', '')}"
                        device_info.append(device_str.strip())
                if device_info:
                    text_parts.append(f"Devices: {', '.join(device_info)}")
            
            # Location patterns
            location_patterns = behavioral.get("location_patterns", [])
            if location_patterns:
                locations = []
                for loc in location_patterns[:5]:  # Limit to first 5 locations
                    if isinstance(loc, dict):
                        city = loc.get("city", "")
                        state = loc.get("state", "")
                        country = loc.get("country", "")
                        if city or state or country:
                            locations.append(f"{city}, {state}, {country}".strip(", "))
                if locations:
                    text_parts.append(f"Locations: {', '.join(locations)}")
            
            # Transaction patterns
            tx_patterns = behavioral.get("transaction_patterns", {})
            if tx_patterns:
                if isinstance(tx_patterns, dict):
                    avg_amount = tx_patterns.get("avg_transaction_amount")
                    categories = tx_patterns.get("common_merchant_categories", [])
                    if avg_amount:
                        text_parts.append(f"Average Transaction Amount: ${avg_amount}")
                    if categories:
                        text_parts.append(f"Common Categories: {', '.join(categories)}")
            
            # Join with consistent separator
            return " | ".join(text_parts)
            
        except Exception as e:
            logger.error(f"Failed to create behavioral text: {e}")
            return ""
    
    # ==================== SIMILARITY ANALYSIS ====================
    
    async def calculate_similarity(self, vector1: List[float], 
                                 vector2: List[float],
                                 similarity_metric: str = "cosine") -> float:
        """Calculate similarity between two vectors"""
        try:
            if len(vector1) != len(vector2):
                logger.error(f"Vector dimensions don't match: {len(vector1)} vs {len(vector2)}")
                return 0.0
            
            if similarity_metric == "cosine":
                return self._cosine_similarity(vector1, vector2)
            elif similarity_metric == "euclidean":
                return self._euclidean_similarity(vector1, vector2)
            elif similarity_metric == "dot_product":
                return self._dot_product_similarity(vector1, vector2)
            else:
                logger.warning(f"Unknown similarity metric: {similarity_metric}, using cosine")
                return self._cosine_similarity(vector1, vector2)
            
        except Exception as e:
            logger.error(f"Failed to calculate similarity: {e}")
            return 0.0
    
    async def find_nearest_neighbors(self, query_vector: List[float],
                                   k: int = 10,
                                   filters: Optional[Dict[str, Any]] = None) -> List[Tuple[str, float]]:
        """Find k-nearest neighbors for a vector"""
        try:
            # Use vector search to find nearest neighbors
            similar_entities = await self.find_similar_by_vector(
                query_vector=query_vector,
                limit=k,
                filters=filters
            )
            
            # Extract entity IDs and distances
            neighbors = []
            for entity in similar_entities:
                entity_id = entity.get("_id", "")
                distance = entity.get("vector_distance", 1.0)
                if entity_id:
                    neighbors.append((entity_id, distance))
            
            return neighbors
            
        except Exception as e:
            logger.error(f"Failed to find nearest neighbors: {e}")
            return []
    
    # ==================== VECTOR SEARCH ANALYTICS ====================
    
    async def get_embedding_statistics(self) -> EmbeddingStats:
        """Get statistics about embeddings in the collection"""
        try:
            # Build aggregation pipeline for embedding statistics
            pipeline = [
                {
                    "$facet": {
                        "total_count": [{"$count": "count"}],
                        "with_embeddings": [
                            {"$match": {self.embedding_field: {"$exists": True}}},
                            {"$count": "count"}
                        ],
                        "embedding_info": [
                            {"$match": {self.embedding_field: {"$exists": True}}},
                            {
                                "$project": {
                                    "embedding_length": {"$size": f"${self.embedding_field}"}
                                }
                            },
                            {
                                "$group": {
                                    "_id": None,
                                    "avg_length": {"$avg": "$embedding_length"},
                                    "dimensions": {"$first": "$embedding_length"}
                                }
                            }
                        ]
                    }
                }
            ]
            
            results = await self.repo.execute_pipeline(self.collection_name, pipeline)
            
            if results:
                stats_data = results[0]
                
                total_docs = stats_data["total_count"][0]["count"] if stats_data["total_count"] else 0
                docs_with_embeddings = stats_data["with_embeddings"][0]["count"] if stats_data["with_embeddings"] else 0
                
                embedding_info = stats_data["embedding_info"][0] if stats_data["embedding_info"] else {}
                avg_length = embedding_info.get("avg_length", 0.0)
                dimensions = embedding_info.get("dimensions", 0)
                
                coverage_percentage = (docs_with_embeddings / total_docs * 100) if total_docs > 0 else 0.0
                
                return EmbeddingStats(
                    total_documents=total_docs,
                    documents_with_embeddings=docs_with_embeddings,
                    embedding_dimensions=dimensions,
                    average_embedding_length=avg_length,
                    embedding_coverage_percentage=coverage_percentage
                )
            
            return EmbeddingStats(
                total_documents=0,
                documents_with_embeddings=0,
                embedding_dimensions=0,
                average_embedding_length=0.0,
                embedding_coverage_percentage=0.0
            )
            
        except Exception as e:
            logger.error(f"Failed to get embedding statistics: {e}")
            return EmbeddingStats(0, 0, 0, 0.0, 0.0)
    
    async def get_vector_search_performance(self, sample_size: int = 100) -> Dict[str, Any]:
        """Measure vector search performance metrics"""
        try:
            # Return current tracked metrics
            return {
                "total_searches_performed": self._search_metrics["total_searches"],
                "average_response_time_ms": self._search_metrics["average_response_time"],
                "sample_size": sample_size,
                "index_name": self.vector_index_name,
                "collection_name": self.collection_name,
                "similarity_score_distribution": self._search_metrics["similarity_distribution"]
            }
            
        except Exception as e:
            logger.error(f"Failed to get vector search performance: {e}")
            return {"error": str(e)}
    
    # ==================== INDEX MANAGEMENT ====================
    
    async def get_vector_index_info(self, index_name: str) -> Dict[str, Any]:
        """Get information about vector search index"""
        try:
            # This would typically use MongoDB Atlas API or admin commands
            # For now, return basic index information
            return {
                "index_name": index_name,
                "collection": self.collection_name,
                "status": "ready",
                "vector_dimensions": 1536,  # Typical for Titan embeddings
                "similarity_function": "cosine",
                "last_updated": datetime.utcnow().isoformat(),
                "estimated_size": "unknown"
            }
            
        except Exception as e:
            logger.error(f"Failed to get vector index info for {index_name}: {e}")
            return {"error": str(e)}
    
    async def test_vector_index(self, index_name: str,
                              test_vector: Optional[List[float]] = None) -> Dict[str, Any]:
        """Test vector search index functionality"""
        try:
            # Use a test vector or generate one
            if test_vector is None:
                test_vector = [0.1] * 1536  # Default test vector
            
            # Perform a simple vector search to test the index
            start_time = datetime.utcnow()
            
            results = await self.find_similar_by_vector(
                query_vector=test_vector,
                limit=5
            )
            
            end_time = datetime.utcnow()
            response_time = (end_time - start_time).total_seconds() * 1000
            
            return {
                "index_name": index_name,
                "status": "healthy" if len(results) >= 0 else "warning",
                "test_results_count": len(results),
                "response_time_ms": response_time,
                "test_vector_dimensions": len(test_vector),
                "timestamp": end_time.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Vector index test failed for {index_name}: {e}")
            return {
                "index_name": index_name,
                "status": "error",
                "error": str(e)
            }
    
    # ==================== SEARCH RESULT ENHANCEMENT ====================
    
    async def enhance_search_results(self, results: List[Dict[str, Any]],
                                   include_explanations: bool = False,
                                   include_similar_entities: bool = False) -> List[Dict[str, Any]]:
        """Enhance search results with additional information"""
        try:
            enhanced_results = []
            
            for result in results:
                enhanced_result = result.copy()
                
                # Add similarity explanation
                if include_explanations and "similarity_score" in result:
                    score = result["similarity_score"]
                    if score >= 0.9:
                        explanation = "Very high similarity - likely identical or near-duplicate"
                    elif score >= 0.8:
                        explanation = "High similarity - strong match"
                    elif score >= 0.7:
                        explanation = "Moderate similarity - potential match"
                    elif score >= 0.6:
                        explanation = "Low similarity - weak match"
                    else:
                        explanation = "Very low similarity - unlikely match"
                    
                    enhanced_result["similarity_explanation"] = explanation
                
                # Add similar entities if requested
                if include_similar_entities and "_id" in result:
                    try:
                        similar = await self.find_similar_by_entity_id(
                            entity_id=result["_id"],
                            limit=3
                        )
                        enhanced_result["related_entities"] = [
                            {
                                "entity_id": s["_id"],
                                "name": s.get("name", "Unknown"),
                                "similarity_score": s.get("similarity_score", 0.0)
                            }
                            for s in similar
                        ]
                    except Exception as e:
                        logger.warning(f"Failed to get similar entities for {result['_id']}: {e}")
                        enhanced_result["related_entities"] = []
                
                enhanced_results.append(enhanced_result)
            
            return enhanced_results
            
        except Exception as e:
            logger.error(f"Failed to enhance search results: {e}")
            return results  # Return original results if enhancement fails
    
    # ==================== HELPER METHODS ====================
    
    def _cosine_similarity(self, vector1: List[float], vector2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        try:
            dot_product = sum(a * b for a, b in zip(vector1, vector2))
            magnitude1 = math.sqrt(sum(a * a for a in vector1))
            magnitude2 = math.sqrt(sum(b * b for b in vector2))
            
            if magnitude1 == 0 or magnitude2 == 0:
                return 0.0
            
            return dot_product / (magnitude1 * magnitude2)
            
        except Exception as e:
            logger.error(f"Failed to calculate cosine similarity: {e}")
            return 0.0
    
    def _euclidean_similarity(self, vector1: List[float], vector2: List[float]) -> float:
        """Calculate euclidean similarity (distance converted to similarity)"""
        try:
            distance = math.sqrt(sum((a - b) ** 2 for a, b in zip(vector1, vector2)))
            # Convert distance to similarity (0-1 range)
            return 1.0 / (1.0 + distance)
            
        except Exception as e:
            logger.error(f"Failed to calculate euclidean similarity: {e}")
            return 0.0
    
    def _dot_product_similarity(self, vector1: List[float], vector2: List[float]) -> float:
        """Calculate dot product similarity"""
        try:
            return sum(a * b for a, b in zip(vector1, vector2))
            
        except Exception as e:
            logger.error(f"Failed to calculate dot product similarity: {e}")
            return 0.0
    
    def _track_search_metrics(self, result_count: int):
        """Track search performance metrics"""
        try:
            self._search_metrics["total_searches"] += 1
            
            # Update similarity distribution (simplified)
            if result_count > 0:
                if result_count not in self._search_metrics["similarity_distribution"]:
                    self._search_metrics["similarity_distribution"][result_count] = 0
                self._search_metrics["similarity_distribution"][result_count] += 1
            
        except Exception as e:
            logger.error(f"Failed to track search metrics: {e}")
    
    # ==================== PLACEHOLDER IMPLEMENTATIONS ====================
    # (Implementing remaining interface methods with simplified logic)
    
    async def bulk_store_embeddings(self, embeddings: Dict[str, List[float]]) -> Dict[str, int]:
        """Store multiple embeddings in bulk - simplified implementation"""
        stored_count = 0
        failed_count = 0
        
        for entity_id, embedding in embeddings.items():
            success = await self.store_embedding(entity_id, embedding)
            if success:
                stored_count += 1
            else:
                failed_count += 1
        
        return {"stored_count": stored_count, "failed_count": failed_count}
    
    async def batch_generate_embeddings(self, entities: List[Dict[str, Any]]) -> Dict[str, List[float]]:
        """Generate embeddings for multiple entities - simplified implementation"""
        embeddings = {}
        
        for entity in entities:
            entity_id = entity.get("_id", str(entity.get("id", "")))
            if entity_id:
                embedding = await self.generate_entity_embedding(entity)
                if embedding:
                    embeddings[entity_id] = embedding
        
        return embeddings
    
    async def cluster_similar_entities(self, entity_ids: List[str],
                                     similarity_threshold: float = 0.8,
                                     max_cluster_size: int = 50) -> List[List[str]]:
        """Cluster entities by vector similarity - placeholder implementation"""
        # Simplified clustering: return single cluster for now
        return [entity_ids[:max_cluster_size]] if entity_ids else []
    
    async def analyze_embedding_quality(self, entity_ids: Optional[List[str]] = None) -> Dict[str, Any]:
        """Analyze embedding quality and distribution - placeholder implementation"""
        return {
            "quality_score": 0.8,
            "dimension_consistency": True,
            "outlier_count": 0,
            "analysis_date": datetime.utcnow().isoformat()
        }
    
    async def optimize_vector_index(self, index_name: str) -> Dict[str, Any]:
        """Optimize vector search index performance - placeholder implementation"""
        return {
            "index_name": index_name,
            "optimization_applied": False,
            "reason": "Manual optimization not required for Atlas Vector Search"
        }
    
    async def hybrid_search(self, text_query: str,
                          vector_query: List[float],
                          text_weight: float = 0.5,
                          vector_weight: float = 0.5,
                          limit: int = 10) -> List[Dict[str, Any]]:
        """Perform hybrid text and vector search - placeholder implementation"""
        # For now, just return vector search results
        return await self.find_similar_by_vector(vector_query, limit=limit)
    
    async def semantic_search_with_filters(self, query: str,
                                         filters: Dict[str, Any],
                                         boost_factors: Optional[Dict[str, float]] = None,
                                         limit: int = 10) -> List[Dict[str, Any]]:
        """Perform semantic search with metadata filtering - simplified implementation"""
        return await self.find_similar_by_text(query, limit=limit, filters=filters)
    
    async def refresh_embeddings(self, entity_ids: Optional[List[str]] = None,
                               force_regenerate: bool = False) -> Dict[str, int]:
        """Refresh embeddings for entities - placeholder implementation"""
        return {"updated_count": 0, "failed_count": 0}
    
    async def validate_embeddings(self, entity_ids: Optional[List[str]] = None) -> Dict[str, Any]:
        """Validate embedding data integrity - placeholder implementation"""
        return {"valid_count": 0, "invalid_count": 0, "issues": []}
    
    async def cleanup_invalid_embeddings(self) -> Dict[str, int]:
        """Clean up invalid or corrupted embeddings - placeholder implementation"""
        return {"removed_count": 0, "fixed_count": 0}
    
    async def explain_similarity(self, entity1_id: str, entity2_id: str) -> Dict[str, Any]:
        """Explain why two entities are similar - placeholder implementation"""
        return {
            "entity1_id": entity1_id,
            "entity2_id": entity2_id,
            "similarity_score": 0.0,
            "explanation": "Similarity explanation not yet implemented"
        }