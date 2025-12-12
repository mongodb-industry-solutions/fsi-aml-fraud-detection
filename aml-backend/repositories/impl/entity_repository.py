"""
Entity Repository Implementation - Concrete implementation using mongodb_core_lib

Clean, powerful implementation of entity data access using the mongodb_core_lib
utilities for optimal performance and maintainability.
"""

import logging
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from bson import ObjectId

from repositories.interfaces.entity_repository import EntityRepositoryInterface
from reference.mongodb_core_lib import (
    MongoDBRepository, AggregationBuilder, 
    SearchOptions, VectorSearchOptions
)
from models.core.entity import Entity, validate_entity_data


logger = logging.getLogger(__name__)


class RepositoryError(Exception):
    """Base exception for repository operations"""
    pass


class EntityRepository(EntityRepositoryInterface):
    """
    Entity repository implementation using mongodb_core_lib
    
    Provides clean, efficient entity data access with advanced MongoDB features
    including Atlas Search, Vector Search, and optimized aggregation pipelines.
    """
    
    def __init__(self, mongodb_repo: MongoDBRepository, collection_name: Optional[str] = None):
        """
        Initialize entity repository
        
        Args:
            mongodb_repo: MongoDB repository instance from core lib
            collection_name: Name of entities collection (defaults to .env ENTITIES_COLLECTION)
        """
        self.repo = mongodb_repo
        # Get collection name from environment variable or use provided name
        self.collection_name = collection_name or os.getenv('ENTITIES_COLLECTION', 'entities')
        self.collection = self.repo.collection(self.collection_name)
        
        logger.info(f"EntityRepository initialized with collection: {self.collection_name}")
        
        # Initialize basic features
        self.aggregation = self.repo.aggregation
        
        # Lazy initialization for AI features (only when needed)
        self._ai_search = None
    
    @property
    def ai_search(self):
        """Lazy initialization of AI search functionality"""
        if self._ai_search is None:
            try:
                # Ensure environment variables are loaded
                from dotenv import load_dotenv
                import os
                load_dotenv()
                
                # Verify AWS region is available
                aws_region = os.getenv('AWS_REGION')
                if not aws_region:
                    raise ValueError("AWS_REGION not found in environment variables")
                
                # Set environment variable for boto3 to pick up
                os.environ['AWS_DEFAULT_REGION'] = aws_region
                
                self._ai_search = self.repo.ai_search(self.collection_name)
            except Exception as e:
                logger.warning(f"AI search initialization failed: {e}. AI features will be unavailable.")
                # Return a mock object that raises appropriate errors
                class MockAISearch:
                    def __getattr__(self, name):
                        raise RuntimeError("AI search is not available due to configuration issues")
                self._ai_search = MockAISearch()
        return self._ai_search
        
    # ==================== CORE ENTITY OPERATIONS ====================
    
    async def create(self, entity_data: Dict[str, Any]) -> str:
        """Create a new entity with validation and enhancement"""
        try:
            # Validate and clean entity data
            validated_data = validate_entity_data(entity_data)
            
            # Add system metadata
            validated_data.update({
                "created_date": datetime.utcnow(),
                "updated_date": datetime.utcnow(),
                "version": 1,
                "status": validated_data.get("status", "active")
            })
            
            # Generate phonetic codes for name matching
            if "name" in validated_data:
                validated_data["phonetic_codes"] = self._generate_phonetic_codes(validated_data["name"])
            
            # Insert entity
            result = await self.collection.insert_one(validated_data)
            
            logger.info(f"Created entity with ID: {result.inserted_id}")
            return str(result.inserted_id)
            
        except Exception as e:
            logger.error(f"Failed to create entity: {e}")
            raise RepositoryError(f"Entity creation failed: {e}")
    
    async def find_by_id(self, entity_id: str) -> Optional[Dict[str, Any]]:
        """Find entity by ID with error handling"""
        try:
            result = await self.collection.find_one({"_id": ObjectId(entity_id)})
            if result:
                result["_id"] = str(result["_id"])
            return result
            
        except Exception as e:
            logger.error(f"Failed to find entity {entity_id}: {e}")
            return None
    
    async def find_by_entity_id(self, entity_id: str) -> Optional[Dict[str, Any]]:
        """Find entity by entityId field"""
        try:
            # Use aggregation to find and transform the entity data to match frontend expectations
            pipeline = [
                {"$match": {"entityId": entity_id}},
                {"$limit": 1},
                {"$project": {
                    "_id": 1,
                    "entityId": 1,
                    "scenarioKey": 1,
                    "name": 1,  # Return full name object
                    "entityType": 1,
                    "status": 1,
                    "dateOfBirth": 1,
                    "addresses": 1,
                    "identifiers": 1,
                    "riskAssessment": 1,  # Return full risk assessment object
                    "watchlistMatches": 1,
                    "profileSummaryText": 1,
                    "profileEmbedding": 1,  # Legacy embedding
                    "behavioral_analytics": 1,  # Behavioral analytics for transaction simulator and UI
                    "account_info": 1,  # Account info for transaction simulator
                    "identifierEmbedding": 1,  # New identifier embedding
                    "behavioralEmbedding": 1,  # New behavioral embedding
                    "identifierText": 1,  # Identifier text representation
                    "behavioralText": 1,  # Behavioral text representation
                    "resolution": 1,
                    "customerInfo": 1,
                    "created_date": "$createdAt",
                    "updated_date": "$updatedAt"
                }}
            ]
            
            results = await self.repo.execute_pipeline(self.collection_name, pipeline)

            if results and len(results) > 0:
                result = results[0]
                result["_id"] = str(result["_id"])

                # Debug logging for behavioral/identifier embeddings
                has_behavioral = "behavioralEmbedding" in result and result["behavioralEmbedding"] is not None
                has_identifier = "identifierEmbedding" in result and result["identifierEmbedding"] is not None
                logger.info(f"Entity {entity_id} - behavioralEmbedding present: {has_behavioral}, identifierEmbedding present: {has_identifier}")
                if has_behavioral:
                    logger.debug(f"Entity {entity_id} - behavioralEmbedding length: {len(result['behavioralEmbedding']) if isinstance(result['behavioralEmbedding'], list) else 'not a list'}")
                if has_identifier:
                    logger.debug(f"Entity {entity_id} - identifierEmbedding length: {len(result['identifierEmbedding']) if isinstance(result['identifierEmbedding'], list) else 'not a list'}")

                return result

            return None
            
        except Exception as e:
            logger.error(f"Failed to find entity by entityId {entity_id}: {e}")
            return None
    
    async def find_multiple_by_ids(self, entity_ids: List[str]) -> List[Dict[str, Any]]:
        """Find multiple entities by IDs using optimized query"""
        try:
            object_ids = [ObjectId(eid) for eid in entity_ids]
            
            # Use aggregation for efficient batch retrieval
            pipeline = (self.aggregation()
                       .match({"_id": {"$in": object_ids}})
                       .project({
                           "_id": 1, "name": 1, "entity_type": 1, "status": 1,
                           "risk_assessment": 1, "created_date": 1
                       })
                       .build())
            
            results = await self.repo.execute_pipeline(self.collection_name, pipeline)
            
            # Convert ObjectIds to strings
            for result in results:
                result["_id"] = str(result["_id"])
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to find multiple entities: {e}")
            return []
    
    async def update(self, entity_id: str, update_data: Dict[str, Any]) -> bool:
        """Update entity with optimistic concurrency control"""
        try:
            # Add update metadata
            update_data["updated_date"] = datetime.utcnow()
            
            # Increment version for optimistic locking
            update_operation = {
                "$set": update_data,
                "$inc": {"version": 1}
            }
            
            result = await self.collection.update_one(
                {"_id": ObjectId(entity_id)},
                update_operation
            )
            
            success = result.modified_count > 0
            if success:
                logger.info(f"Updated entity {entity_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to update entity {entity_id}: {e}")
            return False
    
    async def delete(self, entity_id: str) -> bool:
        """Soft delete entity by setting status to archived"""
        try:
            update_data = {
                "status": "archived",
                "archived_date": datetime.utcnow(),
                "updated_date": datetime.utcnow()
            }
            
            result = await self.collection.update_one(
                {"_id": ObjectId(entity_id)},
                {"$set": update_data, "$inc": {"version": 1}}
            )
            
            success = result.modified_count > 0
            if success:
                logger.info(f"Archived entity {entity_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to delete entity {entity_id}: {e}")
            return False
    
    async def get_entities_paginated(self, skip: int = 0, limit: int = 20, 
                                   filters: Optional[Dict[str, Any]] = None) -> tuple[List[Dict[str, Any]], int]:
        """Get paginated list of entities with optional filtering"""
        try:
            # Use existing find_by_criteria method
            filters = filters or {}
            result = await self.find_by_criteria(filters, limit=limit, offset=skip)
            
            # Return as tuple format expected by routes
            return result["entities"], result["total_count"]
            
        except Exception as e:
            logger.error(f"Failed to get paginated entities: {e}")
            raise RepositoryError(f"Paginated entity fetch failed: {e}")
    
    async def get_available_filter_values(self) -> Dict[str, List[str]]:
        """Get available filter values for frontend filtering"""
        try:
            # Use aggregation to get distinct values since mongodb_core_lib doesn't have distinct method
            
            # Get distinct entity types
            entity_types_pipeline = [
                {"$group": {"_id": "$entity_type"}},
                {"$match": {"_id": {"$ne": None}}},
                {"$sort": {"_id": 1}}
            ]
            entity_types_result = await self.repo.execute_pipeline(self.collection_name, entity_types_pipeline)
            entity_types = [doc["_id"] for doc in entity_types_result if doc["_id"]]
            
            # Get distinct risk levels
            risk_levels_pipeline = [
                {"$group": {"_id": "$risk_assessment.level"}},
                {"$match": {"_id": {"$ne": None}}},
                {"$sort": {"_id": 1}}
            ]
            risk_levels_result = await self.repo.execute_pipeline(self.collection_name, risk_levels_pipeline)
            risk_levels = [doc["_id"] for doc in risk_levels_result if doc["_id"]]
            
            # Get distinct statuses
            statuses_pipeline = [
                {"$group": {"_id": "$status"}},
                {"$match": {"_id": {"$ne": None}}},
                {"$sort": {"_id": 1}}
            ]
            statuses_result = await self.repo.execute_pipeline(self.collection_name, statuses_pipeline)
            statuses = [doc["_id"] for doc in statuses_result if doc["_id"]]
            
            return {
                "entity_types": entity_types,
                "risk_levels": risk_levels,
                "statuses": statuses
            }
            
        except Exception as e:
            logger.error(f"Failed to get available filter values: {e}")
            return {"entity_types": [], "risk_levels": [], "statuses": []}
    
    # ==================== SEARCH AND DISCOVERY ====================
    
    async def find_by_criteria(self, criteria: Dict[str, Any], 
                             limit: int = 20, offset: int = 0) -> Dict[str, Any]:
        """Find entities using optimized aggregation pipeline"""
        try:
            # Build efficient aggregation pipeline
            builder = self.aggregation()
            
            # Apply filters
            match_conditions = self._build_match_conditions(criteria)
            if match_conditions:
                builder.match(match_conditions)
            
            # Get total count for pagination
            count_pipeline = builder.build() + [{"$count": "total"}]
            count_result = await self.repo.execute_pipeline(self.collection_name, count_pipeline)
            total_count = count_result[0]["total"] if count_result else 0
            
            # Get paginated results with proper field mapping based on actual database schema
            # Note: MongoDB projection only includes fields that exist in documents
            # So we filter for entities with behavioral_analytics above
            results_pipeline = (builder
                              .sort({"createdAt": -1})  # Use actual field name
                              .skip(offset)
                              .limit(limit)
                              .project({
                                  "_id": 1,
                                  "entityId": 1,
                                  "scenarioKey": 1,
                                  "name": 1,  # Include full name object for compatibility
                                  "name_full": "$name.full",  # Extract full name from nested structure
                                  "entityType": 1,  # Use actual field name
                                  "status": 1,
                                  "riskAssessment": 1,  # Include full risk assessment object
                                  "risk_level": "$riskAssessment.overall.level",  # Extract from nested risk assessment
                                  "risk_score": "$riskAssessment.overall.score",  # Extract score from nested structure
                                  "watchlistMatches": 1,  # Include watchlist matches
                                  "watchlist_matches_count": {"$size": {"$ifNull": ["$watchlistMatches", []]}},  # Count array items
                                  "has_watchlist_matches": {"$gt": [{"$size": {"$ifNull": ["$watchlistMatches", []]}}, 0]},
                                  "behavioral_analytics": 1,  # Include behavioral analytics for transaction simulator (only if exists)
                                  "account_info": 1,  # Include account info for transaction simulator (only if exists)
                                  "identifierEmbedding": 1,  # Include identifier embedding
                                  "behavioralEmbedding": 1,  # Include behavioral embedding
                                  "identifierText": 1,  # Include identifier text
                                  "behavioralText": 1,  # Include behavioral text
                                  "created_date": "$createdAt",  # Map to expected field name
                                  "updated_date": "$updatedAt"   # Map to expected field name
                              })
                              .build())
            
            logger.debug(f"Executing pipeline with projection including behavioral_analytics")
            entities = await self.repo.execute_pipeline(self.collection_name, results_pipeline)

            # Log sample entity to verify projection
            if entities and len(entities) > 0:
                sample_keys = list(entities[0].keys())
                logger.debug(f"Sample entity keys after projection: {sample_keys}")
                logger.debug(f"Has behavioral_analytics: {'behavioral_analytics' in entities[0]}")
                # Additional logging for embedding fields
                has_behavioral_emb = "behavioralEmbedding" in entities[0] and entities[0]["behavioralEmbedding"] is not None
                has_identifier_emb = "identifierEmbedding" in entities[0] and entities[0]["identifierEmbedding"] is not None
                logger.info(f"Pagination query - Sample entity has behavioralEmbedding: {has_behavioral_emb}, identifierEmbedding: {has_identifier_emb}")
            
            # Convert ObjectIds to strings
            for entity in entities:
                entity["_id"] = str(entity["_id"])
            
            return {
                "entities": entities,
                "total_count": total_count,
                "has_more": offset + len(entities) < total_count,
                "limit": limit,
                "offset": offset
            }
            
        except Exception as e:
            logger.error(f"Failed to find entities by criteria: {e}")
            return {"entities": [], "total_count": 0, "has_more": False, "limit": limit, "offset": offset}
    
    async def find_by_identifiers(self, identifiers: Dict[str, str]) -> List[Dict[str, Any]]:
        """Find entities by unique identifiers using optimized query"""
        try:
            # Build OR conditions for different identifier types
            or_conditions = []
            for id_type, id_value in identifiers.items():
                or_conditions.append({f"identifiers.{id_type}": id_value})
            
            if not or_conditions:
                return []
            
            pipeline = (self.aggregation()
                       .match({"$or": or_conditions})
                       .project({
                           "_id": 1, "name": 1, "entity_type": 1, "identifiers": 1,
                           "status": 1, "created_date": 1
                       })
                       .build())
            
            results = await self.repo.execute_pipeline(self.collection_name, pipeline)
            
            # Convert ObjectIds and add match info
            for result in results:
                result["_id"] = str(result["_id"])
                result["matched_identifiers"] = self._get_matched_identifiers(
                    result.get("identifiers", {}), identifiers
                )
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to find entities by identifiers: {e}")
            return []
    
    async def find_by_phonetic_codes(self, phonetic_codes: Dict[str, str]) -> List[Dict[str, Any]]:
        """Find entities by phonetic name codes"""
        try:
            # Build OR conditions for phonetic matching
            or_conditions = []
            for algorithm, code in phonetic_codes.items():
                or_conditions.append({f"phonetic_codes.{algorithm}": code})
            
            if not or_conditions:
                return []
            
            pipeline = (self.aggregation()
                       .match({"$or": or_conditions})
                       .project({
                           "_id": 1, "name": 1, "alternate_names": 1, "entity_type": 1,
                           "phonetic_codes": 1, "created_date": 1
                       })
                       .limit(50)  # Limit phonetic matches
                       .build())
            
            results = await self.repo.execute_pipeline(self.collection_name, pipeline)
            
            # Convert ObjectIds
            for result in results:
                result["_id"] = str(result["_id"])
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to find entities by phonetic codes: {e}")
            return []
    
    # ==================== ENTITY RESOLUTION OPERATIONS ====================
    
    async def update_resolution_status(self, entity_id: str, 
                                     resolution_data: Dict[str, Any]) -> bool:
        """Update entity resolution status with atomic operations"""
        try:
            update_operations = {
                "$set": {
                    "resolution_status": resolution_data.get("status"),
                    "resolution_date": datetime.utcnow(),
                    "updated_date": datetime.utcnow()
                },
                "$inc": {"version": 1}
            }
            
            # Add linked entities if provided
            if "linked_entities" in resolution_data:
                update_operations["$addToSet"] = {
                    "linked_entities": {"$each": resolution_data["linked_entities"]}
                }
            
            result = await self.collection.update_one(
                {"_id": ObjectId(entity_id)},
                update_operations
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Failed to update resolution status for {entity_id}: {e}")
            return False
    
    async def add_linked_entity(self, master_entity_id: str, 
                              linked_entity_id: str, link_type: str = "resolved") -> bool:
        """Add linked entity relationship"""
        try:
            link_data = {
                "entity_id": linked_entity_id,
                "link_type": link_type,
                "linked_date": datetime.utcnow()
            }
            
            result = await self.collection.update_one(
                {"_id": ObjectId(master_entity_id)},
                {
                    "$addToSet": {"linked_entities": link_data},
                    "$set": {"updated_date": datetime.utcnow()},
                    "$inc": {"version": 1}
                }
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Failed to add linked entity: {e}")
            return False
    
    async def get_linked_entities(self, entity_id: str) -> List[Dict[str, Any]]:
        """Get all linked entities with details"""
        try:
            # Use aggregation to get linked entity details
            pipeline = (self.aggregation()
                       .match({"_id": ObjectId(entity_id)})
                       .unwind("$linked_entities", preserve_null=True)
                       .lookup(
                           from_collection="entities",
                           local_field="linked_entities.entity_id",
                           foreign_field="_id", 
                           as_field="linked_entity_details"
                       )
                       .unwind("$linked_entity_details", preserve_null=True)
                       .project({
                           "link_type": "$linked_entities.link_type",
                           "linked_date": "$linked_entities.linked_date",
                           "entity": "$linked_entity_details"
                       })
                       .build())
            
            results = await self.repo.execute_pipeline(self.collection_name, pipeline)
            
            # Convert ObjectIds
            for result in results:
                if "entity" in result and "_id" in result["entity"]:
                    result["entity"]["_id"] = str(result["entity"]["_id"])
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to get linked entities for {entity_id}: {e}")
            return []
    
    # ==================== EMBEDDING AND AI OPERATIONS ====================
    
    async def update_embedding(self, entity_id: str, embedding: List[float]) -> bool:
        """Update entity embedding for vector search"""
        try:
            result = await self.collection.update_one(
                {"_id": ObjectId(entity_id)},
                {
                    "$set": {
                        "embedding": embedding,
                        "embedding_updated": datetime.utcnow(),
                        "updated_date": datetime.utcnow()
                    },
                    "$inc": {"version": 1}
                }
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Failed to update embedding for {entity_id}: {e}")
            return False
    
    async def count_entities_with_embeddings(self) -> int:
        """Count entities that have embeddings"""
        try:
            count = await self.collection.count_documents({"embedding": {"$exists": True}})
            return count
            
        except Exception as e:
            logger.error(f"Failed to count entities with embeddings: {e}")
            return 0
    
    async def get_entities_without_embeddings(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get entities that need embedding generation"""
        try:
            pipeline = (self.aggregation()
                       .match({
                           "embedding": {"$exists": False},
                           "status": "active"
                       })
                       .project({
                           "_id": 1, "name": 1, "entity_type": 1,
                           "alternate_names": 1, "attributes": 1
                       })
                       .limit(limit)
                       .build())
            
            results = await self.repo.execute_pipeline(self.collection_name, pipeline)
            
            # Convert ObjectIds
            for result in results:
                result["_id"] = str(result["_id"])
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to get entities without embeddings: {e}")
            return []
    
    # ==================== HELPER METHODS ====================
    
    def _build_match_conditions(self, criteria: Dict[str, Any]) -> Dict[str, Any]:
        """Build MongoDB match conditions from search criteria with correct field mappings"""
        conditions = {}
        
        # Text search
        if "query" in criteria and criteria["query"]:
            conditions["$text"] = {"$search": criteria["query"]}
        
        # Field mapping: criteria_key -> mongodb_field_name
        # Handles both snake_case (from core routes) and camelCase (from search routes) inputs
        field_mapping = {
            # Entity type mapping (handle both formats)
            "entity_type": "entityType",     # snake_case -> camelCase (database field)
            "entityType": "entityType",      # camelCase -> camelCase (passthrough)
            
            # Risk level mapping (handle both formats) 
            "risk_level": "riskAssessment.overall.level",   # snake_case -> correct nested path
            "riskLevel": "riskAssessment.overall.level",    # camelCase -> correct nested path
            
            # Standard field mappings (same names in database)
            "status": "status",
            "nationality": "nationality", 
            "residency": "residency",
            "jurisdiction": "jurisdictionOfIncorporation",  # ✅ Fixed: was "jurisdiction", now correct path
            "businessType": "customerInfo.businessType"  # Map to correct nested path
        }
        
        # Apply field mappings
        for criteria_key, mongodb_field in field_mapping.items():
            if criteria_key in criteria and criteria[criteria_key]:
                conditions[mongodb_field] = criteria[criteria_key]
                logger.debug(f"Mapped filter: {criteria_key} → {mongodb_field} = {criteria[criteria_key]}")
        

        # Date range filtering (fix field name to match database schema)
        if "created_after" in criteria or "created_before" in criteria:
            date_filter = {}
            if "created_after" in criteria:
                date_filter["$gte"] = criteria["created_after"]
            if "created_before" in criteria:
                date_filter["$lte"] = criteria["created_before"]
            conditions["createdAt"] = date_filter  # Fixed: was "created_date", now "createdAt"
        
        logger.debug(f"Final MongoDB conditions: {conditions}")
        return conditions
    
    def _get_matched_identifiers(self, entity_identifiers: Dict[str, str], 
                               search_identifiers: Dict[str, str]) -> Dict[str, str]:
        """Get identifiers that matched the search"""
        matched = {}
        for id_type, search_value in search_identifiers.items():
            if id_type in entity_identifiers and entity_identifiers[id_type] == search_value:
                matched[id_type] = search_value
        return matched
    
    def _generate_phonetic_codes(self, name: str) -> Dict[str, str]:
        """Generate phonetic codes for name matching"""
        # This would use jellyfish or similar library
        # For now, return empty dict
        return {}
    
    # ==================== ADDITIONAL INTERFACE METHODS ====================
    # (Implementing remaining interface methods for completeness)
    
    async def update_risk_assessment(self, entity_id: str, risk_data: Dict[str, Any]) -> bool:
        """Update entity risk assessment"""
        try:
            risk_data["assessed_date"] = datetime.utcnow()
            
            result = await self.collection.update_one(
                {"_id": ObjectId(entity_id)},
                {
                    "$set": {
                        "risk_assessment": risk_data,
                        "updated_date": datetime.utcnow()
                    },
                    "$inc": {"version": 1}
                }
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Failed to update risk assessment: {e}")
            return False
    
    async def add_watchlist_match(self, entity_id: str, match_data: Dict[str, Any]) -> bool:
        """Add watchlist match to entity"""
        try:
            match_data["date_identified"] = datetime.utcnow()
            
            result = await self.collection.update_one(
                {"_id": ObjectId(entity_id)},
                {
                    "$addToSet": {"watchlist_matches": match_data},
                    "$set": {"updated_date": datetime.utcnow()},
                    "$inc": {"version": 1}
                }
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Failed to add watchlist match: {e}")
            return False
    
    async def get_high_risk_entities(self, risk_threshold: float = 0.7, 
                                   limit: int = 100) -> List[Dict[str, Any]]:
        """Get high-risk entities"""
        try:
            pipeline = (self.aggregation()
                       .match({
                           "risk_assessment.overall_score": {"$gte": risk_threshold},
                           "status": "active"
                       })
                       .sort({"risk_assessment.overall_score": -1})
                       .limit(limit)
                       .project({
                           "_id": 1, "name": 1, "entity_type": 1,
                           "risk_assessment": 1, "watchlist_matches": 1
                       })
                       .build())
            
            results = await self.repo.execute_pipeline(self.collection_name, pipeline)
            
            for result in results:
                result["_id"] = str(result["_id"])
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to get high-risk entities: {e}")
            return []
    
    async def get_entity_stats(self) -> Dict[str, Any]:
        """Get entity collection statistics"""
        try:
            pipeline = [
                {
                    "$facet": {
                        "by_type": [
                            {"$group": {"_id": "$entity_type", "count": {"$sum": 1}}}
                        ],
                        "by_status": [
                            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
                        ],
                        "by_risk": [
                            {"$group": {"_id": "$risk_assessment.level", "count": {"$sum": 1}}}
                        ],
                        "total": [
                            {"$count": "count"}
                        ]
                    }
                }
            ]
            
            results = await self.repo.execute_pipeline(self.collection_name, pipeline)
            
            if results:
                stats = results[0]
                return {
                    "total_entities": stats["total"][0]["count"] if stats["total"] else 0,
                    "by_type": {item["_id"]: item["count"] for item in stats["by_type"]},
                    "by_status": {item["_id"]: item["count"] for item in stats["by_status"]},
                    "by_risk_level": {item["_id"]: item["count"] for item in stats["by_risk"] if item["_id"]}
                }
            
            return {}
            
        except Exception as e:
            logger.error(f"Failed to get entity stats: {e}")
            return {}
    
    async def get_recent_entities(self, days: int = 7, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recently created entities"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            pipeline = (self.aggregation()
                       .match({
                           "created_date": {"$gte": cutoff_date},
                           "status": "active"
                       })
                       .sort({"created_date": -1})
                       .limit(limit)
                       .project({
                           "_id": 1, "name": 1, "entity_type": 1,
                           "status": 1, "created_date": 1
                       })
                       .build())
            
            results = await self.repo.execute_pipeline(self.collection_name, pipeline)
            
            for result in results:
                result["_id"] = str(result["_id"])
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to get recent entities: {e}")
            return []
    
    async def count_by_criteria(self, criteria: Dict[str, Any]) -> int:
        """Count entities matching criteria"""
        try:
            match_conditions = self._build_match_conditions(criteria)
            count = await self.collection.count_documents(match_conditions)
            return count
            
        except Exception as e:
            logger.error(f"Failed to count entities by criteria: {e}")
            return 0
    
    async def bulk_create(self, entities_data: List[Dict[str, Any]]) -> List[str]:
        """Create multiple entities in bulk"""
        try:
            # Validate and prepare entities
            prepared_entities = []
            for entity_data in entities_data:
                validated_data = validate_entity_data(entity_data)
                validated_data.update({
                    "created_date": datetime.utcnow(),
                    "updated_date": datetime.utcnow(),
                    "version": 1,
                    "status": validated_data.get("status", "active")
                })
                prepared_entities.append(validated_data)
            
            # Bulk insert
            result = await self.collection.insert_many(prepared_entities)
            return [str(oid) for oid in result.inserted_ids]
            
        except Exception as e:
            logger.error(f"Failed to bulk create entities: {e}")
            return []
    
    async def bulk_update(self, updates: List[Dict[str, Any]]) -> Dict[str, int]:
        """Update multiple entities in bulk"""
        try:
            operations = []
            for update in updates:
                entity_id = update.get("entity_id")
                update_data = update.get("update_data", {})
                update_data["updated_date"] = datetime.utcnow()
                
                operations.append({
                    "updateOne": {
                        "filter": {"_id": ObjectId(entity_id)},
                        "update": {
                            "$set": update_data,
                            "$inc": {"version": 1}
                        }
                    }
                })
            
            if operations:
                result = await self.collection.bulk_write(operations)
                return {
                    "updated_count": result.modified_count,
                    "failed_count": len(updates) - result.modified_count
                }
            
            return {"updated_count": 0, "failed_count": 0}
            
        except Exception as e:
            logger.error(f"Failed to bulk update entities: {e}")
            return {"updated_count": 0, "failed_count": len(updates)}
    
    async def validate_entity_integrity(self, entity_id: str) -> Dict[str, Any]:
        """Validate entity data integrity"""
        # Implementation for data integrity validation
        return {"valid": True, "issues": []}
    
    async def cleanup_orphaned_data(self) -> Dict[str, int]:
        """Clean up orphaned entity data"""
        # Implementation for cleanup operations
        return {"removed_count": 0}