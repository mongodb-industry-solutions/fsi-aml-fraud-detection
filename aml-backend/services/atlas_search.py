"""
Atlas Search service for entity resolution and fuzzy matching
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import PyMongoError

from models.entity_resolution import (
    NewOnboardingInput, 
    PotentialMatch, 
    SearchQueryBuilder,
    FindMatchesResponse
)

logger = logging.getLogger(__name__)

class AtlasSearchService:
    """Service for handling Atlas Search operations"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.entities_collection = db.entities
        self.search_index = "entity_resolution_search"
    
    async def find_entity_matches(
        self, 
        input_data: NewOnboardingInput,
        limit: int = 10
    ) -> FindMatchesResponse:
        """
        Find potential entity matches using Atlas Search
        
        Args:
            input_data: New onboarding input data
            limit: Maximum number of matches to return
            
        Returns:
            FindMatchesResponse with potential matches
        """
        try:
            # Build the search query
            query_builder = SearchQueryBuilder(limit=limit)
            
            # Add name search (required)
            query_builder.add_name_search(input_data.name_full, boost=3.0)
            
            # Add address search if provided
            if input_data.address_full:
                query_builder.add_address_search(input_data.address_full, boost=2.0)
            
            # Add identifier search if provided (highest boost)
            if input_data.identifier_value:
                query_builder.add_identifier_search(input_data.identifier_value, boost=5.0)
            
            # Add date filter if provided
            if input_data.date_of_birth:
                query_builder.add_date_filter(input_data.date_of_birth, years_tolerance=2)
            
            # Build aggregation pipeline
            pipeline = query_builder.build_aggregation_pipeline()
            
            logger.info(f"Executing Atlas Search query for: {input_data.name_full}")
            logger.debug(f"Search pipeline: {pipeline}")
            
            # Execute the search
            cursor = self.entities_collection.aggregate(pipeline)
            raw_results = await cursor.to_list(length=limit)
            
            # Convert to PotentialMatch models
            matches = []
            for result in raw_results:
                try:
                    potential_match = self._convert_to_potential_match(result, input_data)
                    matches.append(potential_match)
                except Exception as e:
                    logger.warning(f"Failed to convert search result to PotentialMatch: {e}")
                    continue
            
            # Calculate search metadata
            search_metadata = {
                "query_type": "atlas_search_compound",
                "search_fields": self._get_search_fields(input_data),
                "total_pipeline_stages": len(pipeline),
                "execution_time": datetime.utcnow().isoformat()
            }
            
            logger.info(f"Found {len(matches)} potential matches for {input_data.name_full}")
            
            return FindMatchesResponse(
                input=input_data,
                matches=matches,
                totalMatches=len(matches),
                searchMetadata=search_metadata
            )
            
        except PyMongoError as e:
            logger.error(f"MongoDB error during search: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error during entity search: {e}")
            raise
    
    def _convert_to_potential_match(
        self, 
        search_result: Dict[str, Any], 
        input_data: NewOnboardingInput
    ) -> PotentialMatch:
        """
        Convert Atlas Search result to PotentialMatch model
        
        Args:
            search_result: Raw search result from MongoDB
            input_data: Original input data for comparison
            
        Returns:
            PotentialMatch model
        """
        # Extract basic fields
        entity_id = search_result.get("entityId", "")
        name_full = search_result.get("name", {}).get("full", "")
        date_of_birth = search_result.get("dateOfBirth", "")
        entity_type = search_result.get("entityType", "individual")
        
        # Extract primary address
        primary_address = ""
        addresses = search_result.get("addresses", [])
        if addresses:
            # Try to find primary address first
            primary = next((addr for addr in addresses if addr.get("primary")), None)
            if primary:
                primary_address = primary.get("full", "")
            elif addresses:
                # Fall back to first address
                primary_address = addresses[0].get("full", "")
        
        # Extract risk score
        risk_score = None
        risk_assessment = search_result.get("riskAssessment", {})
        if risk_assessment and "overall" in risk_assessment:
            risk_score = risk_assessment["overall"].get("score")
        
        # Get search score
        search_score = search_result.get("searchScore", 0.0)
        
        # Determine match reasons based on what fields matched
        match_reasons = self._determine_match_reasons(search_result, input_data)
        
        return PotentialMatch(
            entityId=entity_id,
            name_full=name_full,
            dateOfBirth=date_of_birth,
            primaryAddress_full=primary_address,
            riskAssessment_overall_score=risk_score,
            searchScore=search_score,
            matchReasons=match_reasons,
            entityType=entity_type
        )
    
    def _determine_match_reasons(
        self, 
        search_result: Dict[str, Any], 
        input_data: NewOnboardingInput
    ) -> List[str]:
        """
        Determine why this entity matched based on input and highlights
        
        Args:
            search_result: Search result with highlights
            input_data: Original input data
            
        Returns:
            List of match reasons
        """
        reasons = []
        
        # Check for name similarity
        entity_name = search_result.get("name", {}).get("full", "").lower()
        input_name = input_data.name_full.lower()
        if entity_name and input_name:
            # Simple similarity check
            if entity_name == input_name:
                reasons.append("exact_name_match")
            elif len(set(entity_name.split()) & set(input_name.split())) > 0:
                reasons.append("similar_name")
        
        # Check for address similarity
        if input_data.address_full:
            addresses = search_result.get("addresses", [])
            input_address = input_data.address_full.lower()
            for addr in addresses:
                addr_full = addr.get("full", "").lower()
                if addr_full and input_address:
                    if addr_full == input_address:
                        reasons.append("exact_address_match")
                    elif any(word in addr_full for word in input_address.split() if len(word) > 2):
                        reasons.append("similar_address")
                        break
        
        # Check for date of birth similarity
        if input_data.date_of_birth:
            entity_dob = search_result.get("dateOfBirth")
            if entity_dob:
                if entity_dob == input_data.date_of_birth:
                    reasons.append("exact_dob_match")
                else:
                    # Check if within tolerance
                    try:
                        input_date = datetime.strptime(input_data.date_of_birth, '%Y-%m-%d')
                        entity_date = datetime.strptime(entity_dob, '%Y-%m-%d')
                        days_diff = abs((input_date - entity_date).days)
                        if days_diff <= 365:  # Within 1 year
                            reasons.append("similar_dob")
                    except ValueError:
                        pass
        
        # Check for identifier matches
        if input_data.identifier_value:
            identifiers = search_result.get("identifiers", [])
            for identifier in identifiers:
                if identifier.get("value") == input_data.identifier_value:
                    reasons.append("shared_identifier")
                    break
        
        # Check search highlights for additional context
        highlights = search_result.get("searchHighlights", [])
        for highlight in highlights:
            path = highlight.get("path", "")
            if "name" in path and "similar_name" not in reasons:
                reasons.append("highlighted_name")
            elif "address" in path and "similar_address" not in reasons:
                reasons.append("highlighted_address")
        
        # Default if no specific reasons found
        if not reasons and search_result.get("searchScore", 0) > 0:
            reasons.append("general_similarity")
        
        return reasons
    
    def _get_search_fields(self, input_data: NewOnboardingInput) -> List[str]:
        """Get list of fields being searched based on input data"""
        fields = ["name.full", "name.aliases"]
        
        if input_data.address_full:
            fields.append("addresses.full")
        
        if input_data.identifier_value:
            fields.append("identifiers.value")
        
        if input_data.date_of_birth:
            fields.append("dateOfBirth")
        
        return fields
    
    async def test_search_index(self) -> Dict[str, Any]:
        """
        Test if the Atlas Search index is working properly
        
        Returns:
            Dictionary with test results
        """
        try:
            # Simple test query
            test_pipeline = [
                {
                    "$search": {
                        "index": self.search_index,
                        "text": {
                            "query": "test",
                            "path": "name.full"
                        }
                    }
                },
                {"$limit": 1},
                {"$project": {"entityId": 1, "name.full": 1}}
            ]
            
            cursor = self.entities_collection.aggregate(test_pipeline)
            results = await cursor.to_list(length=1)
            
            return {
                "index_accessible": True,
                "test_query_executed": True,
                "sample_results_count": len(results),
                "index_name": self.search_index
            }
            
        except Exception as e:
            logger.error(f"Atlas Search index test failed: {e}")
            return {
                "index_accessible": False,
                "error": str(e),
                "index_name": self.search_index
            }
    
    async def get_search_suggestions(
        self, 
        query: str, 
        field: str = "name.full", 
        limit: int = 5
    ) -> List[str]:
        """
        Get autocomplete suggestions using Atlas Search
        
        Args:
            query: Search query string
            field: Field to search for suggestions
            limit: Maximum number of suggestions
            
        Returns:
            List of suggestion strings
        """
        try:
            # Use autocomplete operator if available
            pipeline = [
                {
                    "$search": {
                        "index": self.search_index,
                        "autocomplete": {
                            "query": query,
                            "path": field,
                            "tokenOrder": "sequential"
                        }
                    }
                },
                {"$limit": limit},
                {"$project": {field: 1, "_id": 0}}
            ]
            
            cursor = self.entities_collection.aggregate(pipeline)
            results = await cursor.to_list(length=limit)
            
            # Extract suggestions
            suggestions = []
            for result in results:
                # Navigate nested field path
                value = result
                for part in field.split('.'):
                    if isinstance(value, dict) and part in value:
                        value = value[part]
                    else:
                        value = None
                        break
                
                if value and isinstance(value, str):
                    suggestions.append(value)
            
            return list(set(suggestions))  # Remove duplicates
            
        except Exception as e:
            logger.error(f"Error getting search suggestions: {e}")
            return []