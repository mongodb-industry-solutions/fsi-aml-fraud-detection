"""
Atlas Search Faceted Search Service
Provides advanced search capabilities using MongoDB Atlas Search with faceting, autocomplete, and range filtering.
"""

from typing import Dict, List, Optional, Any
import logging
from pymongo import MongoClient
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection

logger = logging.getLogger(__name__)


class AtlasSearchService:
    """Service for Atlas Search operations with faceting capabilities"""
    
    def __init__(self, collection: AsyncIOMotorCollection, search_index: str = "entity_search_index_v2"):
        self.collection = collection
        self.search_index = search_index
    
    async def faceted_entity_search(
        self,
        search_query: Optional[str] = None,
        entity_type: Optional[str] = None,
        risk_level: Optional[str] = None,
        status: Optional[str] = None,
        scenario_key: Optional[str] = None,
        country: Optional[str] = None,
        business_type: Optional[str] = None,
        risk_score_min: Optional[float] = None,
        risk_score_max: Optional[float] = None,
        skip: int = 0,
        limit: int = 20
    ) -> Dict[str, Any]:
        """
        Perform faceted search with all supported filters
        
        Returns:
            Dict containing entities, facets, and pagination info
        """
        try:
            # Build the aggregation pipeline
            pipeline = []
            
            # 1. Atlas Search stage with faceting
            search_stage = self._build_search_stage(
                search_query=search_query,
                entity_type=entity_type,
                risk_level=risk_level,
                scenario_key=scenario_key,
                country=country,
                business_type=business_type,
                risk_score_min=risk_score_min,
                risk_score_max=risk_score_max
            )
            pipeline.append(search_stage)
            
            # 2. Add status filter (not in Atlas Search index)
            if status:
                pipeline.append({"$match": {"status": status}})
            
            # 3. Add facet stage for counts and pagination
            facet_stage = {
                "$facet": {
                    "entities": [
                        {"$skip": skip},
                        {"$limit": limit}
                    ],
                    "totalCount": [
                        {"$count": "count"}
                    ]
                }
            }
            pipeline.append(facet_stage)
            
            # Execute the aggregation
            cursor = self.collection.aggregate(pipeline)
            result = await cursor.to_list(length=1)
            
            if not result:
                return {
                    "entities": [],
                    "facets": {},
                    "total_count": 0,
                    "has_next": False,
                    "has_previous": skip > 0
                }
            
            data = result[0]
            entities = data.get("entities", [])
            total_count_list = data.get("totalCount", [])
            total_count = total_count_list[0].get("count", 0) if total_count_list else 0

            
            # Get facets separately (Atlas Search facets)
            facets = await self._get_facets(
                search_query=search_query,
                entity_type=entity_type,
                risk_level=risk_level,
                status=status,
                scenario_key=scenario_key,
                country=country,
                business_type=business_type,
                risk_score_min=risk_score_min,
                risk_score_max=risk_score_max
            )
            
            # Calculate pagination
            has_next = (skip + limit) < total_count
            has_previous = skip > 0
            
            return {
                "entities": entities,
                "facets": facets,
                "total_count": total_count,
                "has_next": has_next,
                "has_previous": has_previous
            }
            
        except Exception as e:
            logger.error(f"Error in faceted entity search: {e}")
            raise
    
    def _build_search_stage(
        self,
        search_query: Optional[str] = None,
        entity_type: Optional[str] = None,
        risk_level: Optional[str] = None,
        scenario_key: Optional[str] = None,
        country: Optional[str] = None,
        business_type: Optional[str] = None,
        risk_score_min: Optional[float] = None,
        risk_score_max: Optional[float] = None
    ) -> Dict[str, Any]:
        """Build the Atlas Search stage with compound queries and filters"""
        
        compound_clauses = []
        
        # Text search on name with fuzzy matching
        if search_query and search_query.strip():
            compound_clauses.append({
                "text": {
                    "query": search_query.strip(),
                    "path": "name.full",
                    "fuzzy": {
                        "maxEdits": 1,
                        "prefixLength": 1,
                        "maxExpansions": 100
                    }
                }
            })
        
        # Entity type filter
        if entity_type:
            compound_clauses.append({
                "equals": {
                    "path": "entityType",
                    "value": entity_type
                }
            })
        
        # Risk level filter
        if risk_level:
            compound_clauses.append({
                "equals": {
                    "path": "riskAssessment.overall.level",
                    "value": risk_level
                }
            })
        
        # Scenario key filter
        if scenario_key:
            compound_clauses.append({
                "equals": {
                    "path": "scenarioKey",
                    "value": scenario_key
                }
            })
        
        # Country filter
        if country:
            compound_clauses.append({
                "equals": {
                    "path": "addresses.structured.country",
                    "value": country
                }
            })
        
        # Business type filter
        if business_type:
            compound_clauses.append({
                "equals": {
                    "path": "customerInfo.businessType",
                    "value": business_type
                }
            })
        
        # Risk score range filter
        if risk_score_min is not None or risk_score_max is not None:
            range_filter = {"path": "riskAssessment.overall.score"}
            if risk_score_min is not None:
                range_filter["gte"] = risk_score_min
            if risk_score_max is not None:
                range_filter["lte"] = risk_score_max
            
            compound_clauses.append({
                "range": range_filter
            })
        
        # Build the search stage
        if compound_clauses:
            if len(compound_clauses) == 1:
                operator = compound_clauses[0]
            else:
                operator = {"compound": {"must": compound_clauses}}
        else:
            # If no filters, match all documents using exists
            operator = {"exists": {"path": "entityType"}}
        
        return {
            "$search": {
                "index": self.search_index,
                **operator
            }
        }
    
    async def _get_facets(
        self,
        search_query: Optional[str] = None,
        entity_type: Optional[str] = None,
        risk_level: Optional[str] = None,
        status: Optional[str] = None,
        scenario_key: Optional[str] = None,
        country: Optional[str] = None,
        business_type: Optional[str] = None,
        risk_score_min: Optional[float] = None,
        risk_score_max: Optional[float] = None
    ) -> Dict[str, Any]:
        """Get facet counts using Atlas Search faceting capabilities"""
        
        # Build facet operator
        compound_clauses = []
        
        # Add all active filters except the one we're faceting
        if search_query and search_query.strip():
            compound_clauses.append({
                "text": {
                    "query": search_query.strip(),
                    "path": "name.full",
                    "fuzzy": {
                        "maxEdits": 1,
                        "prefixLength": 1,
                        "maxExpansions": 100
                    }
                }
            })
        
        # Base operator for faceting
        if compound_clauses:
            if len(compound_clauses) == 1:
                facet_operator = compound_clauses[0]
            else:
                facet_operator = {"compound": {"must": compound_clauses}}
        else:
            facet_operator = {"exists": {"path": "entityType"}}
        
        # Atlas Search facet aggregation
        facet_pipeline = [
            {
                "$searchMeta": {
                    "index": self.search_index,
                    "facet": {
                        "operator": facet_operator,
                        "facets": {
                            "entityType": {
                                "type": "string",
                                "path": "entityType"
                            },
                            "riskLevel": {
                                "type": "string", 
                                "path": "riskAssessment.overall.level"
                            },
                            "country": {
                                "type": "string",
                                "path": "addresses.structured.country"
                            },
                            "businessType": {
                                "type": "string",
                                "path": "customerInfo.businessType"
                            },
                            "riskScoreRange": {
                                "type": "number",
                                "path": "riskAssessment.overall.score",
                                "boundaries": [0, 25, 50, 75, 100]
                            }
                        }
                    }
                }
            }
        ]
        
        try:
            cursor = self.collection.aggregate(facet_pipeline)
            facet_result = await cursor.to_list(length=1)
            
            if facet_result and "facet" in facet_result[0]:
                atlas_facets = facet_result[0]["facet"]
                
                # Get status facets separately (not in Atlas Search index)
                status_facets = await self._get_status_facets()
                
                # Get scenario key facets separately
                scenario_facets = await self._get_scenario_facets()
                
                return {
                    "entityType": atlas_facets.get("entityType", {}).get("buckets", []),
                    "riskLevel": atlas_facets.get("riskLevel", {}).get("buckets", []),
                    "country": atlas_facets.get("country", {}).get("buckets", [])[:10],  # Top 10 countries
                    "businessType": atlas_facets.get("businessType", {}).get("buckets", []),
                    "riskScoreRange": atlas_facets.get("riskScoreRange", {}).get("buckets", []),
                    "status": status_facets,
                    "scenarioKey": scenario_facets[:20]  # Top 20 scenarios
                }
            
            return {}
            
        except Exception as e:
            logger.error(f"Error getting facets: {e}")
            return {}
    
    async def _get_status_facets(self) -> List[Dict[str, Any]]:
        """Get status facet counts using regular aggregation"""
        try:
            pipeline = [
                {"$group": {"_id": "$status", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]
            
            cursor = self.collection.aggregate(pipeline)
            results = await cursor.to_list(length=None)
            
            return [
                {"_id": result["_id"], "count": result["count"]}
                for result in results
                if result["_id"] is not None
            ]
        except Exception as e:
            logger.error(f"Error getting status facets: {e}")
            return []
    
    async def _get_scenario_facets(self) -> List[Dict[str, Any]]:
        """Get scenario key facet counts using regular aggregation"""
        try:
            pipeline = [
                {"$match": {"scenarioKey": {"$ne": None}}},
                {"$group": {"_id": "$scenarioKey", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]
            
            cursor = self.collection.aggregate(pipeline)
            results = await cursor.to_list(length=None)
            
            return [
                {"_id": result["_id"], "count": result["count"]}
                for result in results
            ]
        except Exception as e:
            logger.error(f"Error getting scenario facets: {e}")
            return []
    
    async def autocomplete_entity_names(
        self,
        query: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Provide autocomplete suggestions for entity names
        
        Args:
            query: The search query for autocomplete
            limit: Maximum number of suggestions
            
        Returns:
            List of autocomplete suggestions with highlights
        """
        if not query or len(query.strip()) < 2:
            return []
        
        try:
            pipeline = [
                {
                    "$search": {
                        "index": self.search_index,
                        "autocomplete": {
                            "query": query.strip(),
                            "path": "name.full",
                            "tokenOrder": "any",
                            "fuzzy": {
                                "maxEdits": 2,
                                "prefixLength": 1,
                                "maxExpansions": 256
                            }
                        },
                        "highlight": {
                            "path": "name.full"
                        }
                    }
                },
                {
                    "$limit": limit
                },
                {
                    "$project": {
                        "entityId": 1,
                        "entityType": 1,
                        "name.full": 1,
                        "riskAssessment.overall.level": 1,
                        "highlights": {"$meta": "searchHighlights"},
                        "score": {"$meta": "searchScore"}
                    }
                }
            ]
            
            cursor = self.collection.aggregate(pipeline)
            results = await cursor.to_list(length=limit)
            
            return results
            
        except Exception as e:
            logger.error(f"Error in autocomplete: {e}")
            return []
    
    async def get_risk_score_distribution(self) -> Dict[str, Any]:
        """Get risk score distribution for range slider setup"""
        try:
            pipeline = [
                {
                    "$group": {
                        "_id": None,
                        "min_score": {"$min": "$riskAssessment.overall.score"},
                        "max_score": {"$max": "$riskAssessment.overall.score"},
                        "avg_score": {"$avg": "$riskAssessment.overall.score"},
                        "count": {"$sum": 1}
                    }
                }
            ]
            
            cursor = self.collection.aggregate(pipeline)
            result = await cursor.to_list(length=1)
            
            if result:
                return result[0]
            return {"min_score": 0, "max_score": 100, "avg_score": 50, "count": 0}
            
        except Exception as e:
            logger.error(f"Error getting risk score distribution: {e}")
            return {"min_score": 0, "max_score": 100, "avg_score": 50, "count": 0}