# MongoDB Core Utilities Library
# File: mongodb_core/__init__.py

from typing import Dict, List, Any, Optional, Union, Type, Callable, Tuple, Set
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorCollection
from pymongo import MongoClient, UpdateOne, InsertOne, DeleteOne
from pymongo.errors import BulkWriteError
from datetime import datetime, timedelta
import asyncio
from dataclasses import dataclass, field
from enum import Enum
import json
from bson import ObjectId, json_util
import numpy as np
from collections import defaultdict
import logging

# AWS Bedrock imports for embeddings and LLM
import boto3
from typing import AsyncIterator

logger = logging.getLogger(__name__)

# ==================== ENUMS AND CONSTANTS ====================

class AggregationStage(Enum):
    """Enumeration of all MongoDB aggregation pipeline stages"""
    MATCH = "$match"
    PROJECT = "$project"
    GROUP = "$group"
    SORT = "$sort"
    LIMIT = "$limit"
    SKIP = "$skip"
    UNWIND = "$unwind"
    LOOKUP = "$lookup"
    GRAPH_LOOKUP = "$graphLookup"
    FACET = "$facet"
    BUCKET = "$bucket"
    BUCKET_AUTO = "$bucketAuto"
    COUNT = "$count"
    ADD_FIELDS = "$addFields"
    REPLACE_ROOT = "$replaceRoot"
    MERGE = "$merge"
    OUT = "$out"
    SAMPLE = "$sample"
    SET = "$set"
    UNSET = "$unset"
    UNION_WITH = "$unionWith"
    SEARCH = "$search"
    VECTOR_SEARCH = "$vectorSearch"
    GEO_NEAR = "$geoNear"
    DENSIFY = "$densify"
    FILL = "$fill"
    
class GeoQueryType(Enum):
    """Types of geospatial queries"""
    NEAR = "near"
    WITHIN = "within"
    INTERSECTS = "intersects"
    
class ChangeStreamOperation(Enum):
    """Change stream operation types"""
    INSERT = "insert"
    UPDATE = "update"
    REPLACE = "replace"
    DELETE = "delete"
    DROP = "drop"
    RENAME = "rename"
    DROP_DATABASE = "dropDatabase"
    INVALIDATE = "invalidate"

# ==================== DATA CLASSES ====================

@dataclass
class GeoPoint:
    """Represents a geographic point"""
    longitude: float
    latitude: float
    
    def to_geojson(self) -> Dict[str, Any]:
        return {
            "type": "Point",
            "coordinates": [self.longitude, self.latitude]
        }

@dataclass
class SearchOptions:
    """Options for text and vector search"""
    index: str
    fuzzy: Optional[Dict[str, Any]] = None
    highlight: Optional[Dict[str, Any]] = None
    score_details: bool = False
    return_stored_source: bool = True
    
@dataclass
class VectorSearchOptions:
    """Options specific to vector search"""
    index: str
    path: str
    num_candidates: int = 100
    limit: int = 10
    filter: Optional[Dict[str, Any]] = None
    similarity: str = "cosine"  # cosine, euclidean, dotProduct

# ==================== AGGREGATION BUILDER ====================

class AggregationBuilder:
    """Fluent interface for building MongoDB aggregation pipelines"""
    
    def __init__(self):
        self.pipeline: List[Dict[str, Any]] = []
        
    def match(self, filter_dict: Dict[str, Any]) -> 'AggregationBuilder':
        """Add a $match stage"""
        self.pipeline.append({AggregationStage.MATCH.value: filter_dict})
        return self
        
    def project(self, projection: Dict[str, Any]) -> 'AggregationBuilder':
        """Add a $project stage"""
        self.pipeline.append({AggregationStage.PROJECT.value: projection})
        return self
        
    def group(self, group_spec: Dict[str, Any]) -> 'AggregationBuilder':
        """Add a $group stage"""
        self.pipeline.append({AggregationStage.GROUP.value: group_spec})
        return self
        
    def sort(self, sort_spec: Dict[str, int]) -> 'AggregationBuilder':
        """Add a $sort stage"""
        self.pipeline.append({AggregationStage.SORT.value: sort_spec})
        return self
        
    def limit(self, n: int) -> 'AggregationBuilder':
        """Add a $limit stage"""
        self.pipeline.append({AggregationStage.LIMIT.value: n})
        return self
        
    def skip(self, n: int) -> 'AggregationBuilder':
        """Add a $skip stage"""
        self.pipeline.append({AggregationStage.SKIP.value: n})
        return self
        
    def unwind(self, path: str, preserve_null: bool = False) -> 'AggregationBuilder':
        """Add an $unwind stage"""
        unwind_spec = {"path": path, "preserveNullAndEmptyArrays": preserve_null}
        self.pipeline.append({AggregationStage.UNWIND.value: unwind_spec})
        return self
        
    def lookup(self, from_collection: str, local_field: str, foreign_field: str, as_field: str) -> 'AggregationBuilder':
        """Add a $lookup stage"""
        lookup_spec = {
            "from": from_collection,
            "localField": local_field,
            "foreignField": foreign_field,
            "as": as_field
        }
        self.pipeline.append({AggregationStage.LOOKUP.value: lookup_spec})
        return self
        
    def graph_lookup(self, from_collection: str, start_with: str, connect_from: str, 
                     connect_to: str, as_field: str, max_depth: Optional[int] = None) -> 'AggregationBuilder':
        """Add a $graphLookup stage for graph traversal"""
        graph_spec = {
            "from": from_collection,
            "startWith": start_with,
            "connectFromField": connect_from,
            "connectToField": connect_to,
            "as": as_field
        }
        if max_depth is not None:
            graph_spec["maxDepth"] = max_depth
        self.pipeline.append({AggregationStage.GRAPH_LOOKUP.value: graph_spec})
        return self
        
    def facet(self, facets: Dict[str, List[Dict[str, Any]]]) -> 'AggregationBuilder':
        """Add a $facet stage for multiple aggregation pipelines"""
        self.pipeline.append({AggregationStage.FACET.value: facets})
        return self
        
    def text_search(self, query: str, options: Optional[SearchOptions] = None) -> 'AggregationBuilder':
        """Add a $search stage for Atlas Search"""
        search_spec = {
            "text": {
                "query": query,
                "path": {"wildcard": "*"}
            }
        }
        
        if options:
            search_spec["index"] = options.index
            if options.fuzzy:
                search_spec["text"]["fuzzy"] = options.fuzzy
            if options.highlight:
                search_spec["highlight"] = options.highlight
            if options.score_details:
                search_spec["scoreDetails"] = options.score_details
                
        self.pipeline.append({AggregationStage.SEARCH.value: search_spec})
        return self
        
    def vector_search(self, query_vector: List[float], options: VectorSearchOptions) -> 'AggregationBuilder':
        """Add a $vectorSearch stage for semantic search"""
        vector_spec = {
            "index": options.index,
            "path": options.path,
            "queryVector": query_vector,
            "numCandidates": options.num_candidates,
            "limit": options.limit
        }
        
        if options.filter:
            vector_spec["filter"] = options.filter
            
        self.pipeline.append({AggregationStage.VECTOR_SEARCH.value: vector_spec})
        return self
        
    def geo_near(self, point: GeoPoint, distance_field: str, max_distance: Optional[float] = None,
                 query: Optional[Dict[str, Any]] = None, spherical: bool = True) -> 'AggregationBuilder':
        """Add a $geoNear stage for geospatial queries"""
        geo_spec = {
            "near": point.to_geojson(),
            "distanceField": distance_field,
            "spherical": spherical
        }
        
        if max_distance:
            geo_spec["maxDistance"] = max_distance
        if query:
            geo_spec["query"] = query
            
        self.pipeline.append({AggregationStage.GEO_NEAR.value: geo_spec})
        return self
        
    def add_fields(self, fields: Dict[str, Any]) -> 'AggregationBuilder':
        """Add an $addFields stage"""
        self.pipeline.append({AggregationStage.ADD_FIELDS.value: fields})
        return self
        
    def replace_root(self, new_root: str) -> 'AggregationBuilder':
        """Add a $replaceRoot stage"""
        self.pipeline.append({AggregationStage.REPLACE_ROOT.value: {"newRoot": new_root}})
        return self
        
    def sample(self, size: int) -> 'AggregationBuilder':
        """Add a $sample stage for random sampling"""
        self.pipeline.append({AggregationStage.SAMPLE.value: {"size": size}})
        return self
        
    def bucket(self, group_by: str, boundaries: List[Any], default: Any = "Other") -> 'AggregationBuilder':
        """Add a $bucket stage for bucketing"""
        bucket_spec = {
            "groupBy": group_by,
            "boundaries": boundaries,
            "default": default
        }
        self.pipeline.append({AggregationStage.BUCKET.value: bucket_spec})
        return self
        
    def build(self) -> List[Dict[str, Any]]:
        """Build and return the pipeline"""
        return self.pipeline
        
    def __repr__(self) -> str:
        return json.dumps(self.pipeline, indent=2, default=str)

# ==================== GEOSPATIAL INTELLIGENCE ====================

class GeospatialIntelligence:
    """Advanced geospatial operations for MongoDB"""
    
    def __init__(self, collection: Union[AsyncIOMotorCollection, Any]):
        self.collection = collection
        
    async def create_2dsphere_index(self, field: str) -> str:
        """Create a 2dsphere index for geospatial queries"""
        return await self.collection.create_index([(field, "2dsphere")])
        
    async def find_nearby(self, point: GeoPoint, max_distance: float, 
                         min_distance: Optional[float] = None,
                         additional_filter: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Find documents near a point"""
        query = {
            "location": {
                "$near": {
                    "$geometry": point.to_geojson(),
                    "$maxDistance": max_distance
                }
            }
        }
        
        if min_distance:
            query["location"]["$near"]["$minDistance"] = min_distance
            
        if additional_filter:
            query.update(additional_filter)
            
        return await self.collection.find(query).to_list(None)
        
    async def find_within_polygon(self, polygon_coords: List[List[float]], 
                                 additional_filter: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Find documents within a polygon"""
        query = {
            "location": {
                "$geoWithin": {
                    "$geometry": {
                        "type": "Polygon",
                        "coordinates": [polygon_coords]
                    }
                }
            }
        }
        
        if additional_filter:
            query.update(additional_filter)
            
        return await self.collection.find(query).to_list(None)
        
    async def aggregate_by_distance(self, point: GeoPoint, distance_ranges: List[Tuple[float, float]],
                                   group_field: str = "distance_range") -> List[Dict[str, Any]]:
        """Aggregate documents by distance ranges"""
        builder = AggregationBuilder()
        
        # First, add distance field
        builder.geo_near(point, "distance", max_distance=max(r[1] for r in distance_ranges))
        
        # Create buckets for distance ranges
        boundaries = sorted(set([r[0] for r in distance_ranges] + [r[1] for r in distance_ranges]))
        builder.bucket(f"$distance", boundaries)
        
        pipeline = builder.build()
        return await self.collection.aggregate(pipeline).to_list(None)
        
    async def calculate_route_distance(self, waypoints: List[GeoPoint]) -> float:
        """Calculate total distance for a route through waypoints"""
        if len(waypoints) < 2:
            return 0.0
            
        total_distance = 0.0
        for i in range(len(waypoints) - 1):
            # Haversine formula for distance calculation
            lat1, lon1 = waypoints[i].latitude, waypoints[i].longitude
            lat2, lon2 = waypoints[i + 1].latitude, waypoints[i + 1].longitude
            
            R = 6371000  # Earth's radius in meters
            phi1 = np.radians(lat1)
            phi2 = np.radians(lat2)
            delta_phi = np.radians(lat2 - lat1)
            delta_lambda = np.radians(lon2 - lon1)
            
            a = np.sin(delta_phi/2)**2 + np.cos(phi1) * np.cos(phi2) * np.sin(delta_lambda/2)**2
            c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))
            
            total_distance += R * c
            
        return total_distance

# ==================== GRAPH OPERATIONS ====================

class GraphOperations:
    """Graph database operations using MongoDB"""
    
    def __init__(self, collection: Union[AsyncIOMotorCollection, Any]):
        self.collection = collection
        
    async def find_connections(self, start_id: ObjectId, relationship_field: str,
                             max_depth: int = 3) -> List[Dict[str, Any]]:
        """Find all connections from a starting node"""
        builder = AggregationBuilder()
        builder.match({"_id": start_id})
        builder.graph_lookup(
            from_collection=self.collection.name,
            start_with=f"${relationship_field}",
            connect_from=relationship_field,
            connect_to="_id",
            as_field="connections",
            max_depth=max_depth
        )
        
        pipeline = builder.build()
        results = await self.collection.aggregate(pipeline).to_list(None)
        return results[0]["connections"] if results else []
        
    async def find_shortest_path(self, start_id: ObjectId, end_id: ObjectId,
                               relationship_field: str) -> Optional[List[ObjectId]]:
        """Find shortest path between two nodes using BFS"""
        visited = set()
        queue = [(start_id, [start_id])]
        
        while queue:
            current_id, path = queue.pop(0)
            
            if current_id == end_id:
                return path
                
            if current_id in visited:
                continue
                
            visited.add(current_id)
            
            # Get neighbors
            doc = await self.collection.find_one({"_id": current_id})
            if doc and relationship_field in doc:
                neighbors = doc[relationship_field]
                if not isinstance(neighbors, list):
                    neighbors = [neighbors]
                    
                for neighbor_id in neighbors:
                    if neighbor_id not in visited:
                        queue.append((neighbor_id, path + [neighbor_id]))
                        
        return None
        
    async def calculate_centrality(self, node_field: str = "_id",
                                 relationship_field: str = "connections") -> Dict[ObjectId, float]:
        """Calculate degree centrality for all nodes"""
        centrality = defaultdict(int)
        
        async for doc in self.collection.find():
            node_id = doc[node_field]
            connections = doc.get(relationship_field, [])
            if not isinstance(connections, list):
                connections = [connections]
                
            centrality[node_id] += len(connections)
            for conn in connections:
                centrality[conn] += 1
                
        # Normalize
        max_degree = max(centrality.values()) if centrality else 1
        return {k: v / max_degree for k, v in centrality.items()}
        
    async def detect_communities(self, relationship_field: str,
                               min_community_size: int = 3) -> List[Set[ObjectId]]:
        """Detect communities using connected components"""
        graph = defaultdict(set)
        
        # Build adjacency list
        async for doc in self.collection.find():
            node_id = doc["_id"]
            connections = doc.get(relationship_field, [])
            if not isinstance(connections, list):
                connections = [connections]
                
            for conn in connections:
                graph[node_id].add(conn)
                graph[conn].add(node_id)
                
        # Find connected components
        visited = set()
        communities = []
        
        for node in graph:
            if node not in visited:
                community = set()
                stack = [node]
                
                while stack:
                    current = stack.pop()
                    if current not in visited:
                        visited.add(current)
                        community.add(current)
                        stack.extend(graph[current] - visited)
                        
                if len(community) >= min_community_size:
                    communities.append(community)
                    
        return communities

# ==================== AI/VECTOR SEARCH ====================

class AIVectorSearch:
    """AI-powered search with embeddings and RAG"""
    
    def __init__(self, collection: Union[AsyncIOMotorCollection, Any],
                 bedrock_client: Optional[boto3.client] = None,
                 embedding_model: str = "amazon.titan-embed-text-v1",
                 llm_model: str = "anthropic.claude-v2"):
        self.collection = collection
        self.bedrock = bedrock_client or self._create_bedrock_client()
        self.embedding_model = embedding_model
        self.llm_model = llm_model
    
    def _create_bedrock_client(self):
        """Create a properly configured bedrock client with region handling"""
        try:
            import os
            
            # Get region from environment variables (same pattern as working code)
            region = os.environ.get("AWS_REGION", os.environ.get("AWS_DEFAULT_REGION", "us-east-1"))
            
            # Support AWS profiles for CLI-based authentication
            session_kwargs = {"region_name": region}
            profile_name = os.environ.get("AWS_PROFILE")
            
            if profile_name:
                session_kwargs["profile_name"] = profile_name
            
            # Create session first, then client (same pattern as working code)
            session = boto3.Session(**session_kwargs)
            
            bedrock_client = session.client(
                service_name='bedrock-runtime',
                region_name=region
            )
            
            logger.info(f"Bedrock client created successfully for region: {region}")
            return bedrock_client
            
        except Exception as e:
            logger.warning(f"Could not create Bedrock client: {e}. AI features will be disabled.")
            return None
        
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embeddings using AWS Bedrock"""
        if not self.bedrock:
            raise RuntimeError("Bedrock client not available. AI features are disabled.")
            
        try:
            response = self.bedrock.invoke_model(
                modelId=self.embedding_model,
                body=json.dumps({"inputText": text})
            )
            
            result = json.loads(response['body'].read())
            return result['embedding']
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            raise
            
    async def semantic_search(self, query: str, limit: int = 10,
                            filter_dict: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Perform semantic search using vector embeddings"""
        # Generate query embedding
        query_embedding = await self.generate_embedding(query)
        
        # Build vector search aggregation
        builder = AggregationBuilder()
        
        options = VectorSearchOptions(
            index="vector_index",
            path="embedding",
            limit=limit,
            filter=filter_dict
        )
        
        builder.vector_search(query_embedding, options)
        builder.add_fields({
            "search_score": {"$meta": "vectorSearchScore"}
        })
        
        pipeline = builder.build()
        return await self.collection.aggregate(pipeline).to_list(None)
        
    async def hybrid_search(self, query: str, text_weight: float = 0.5,
                          vector_weight: float = 0.5, limit: int = 10) -> List[Dict[str, Any]]:
        """Combine text and vector search"""
        # Get text search results
        text_builder = AggregationBuilder()
        text_builder.text_search(query)
        text_builder.add_fields({"text_score": {"$meta": "searchScore"}})
        text_builder.limit(limit * 2)
        
        text_results = await self.collection.aggregate(text_builder.build()).to_list(None)
        
        # Get vector search results
        vector_results = await self.semantic_search(query, limit * 2)
        
        # Combine and re-rank
        combined = {}
        
        for doc in text_results:
            doc_id = str(doc["_id"])
            combined[doc_id] = {
                "doc": doc,
                "score": doc.get("text_score", 0) * text_weight
            }
            
        for doc in vector_results:
            doc_id = str(doc["_id"])
            if doc_id in combined:
                combined[doc_id]["score"] += doc.get("search_score", 0) * vector_weight
            else:
                combined[doc_id] = {
                    "doc": doc,
                    "score": doc.get("search_score", 0) * vector_weight
                }
                
        # Sort by combined score
        ranked = sorted(combined.values(), key=lambda x: x["score"], reverse=True)
        return [item["doc"] for item in ranked[:limit]]
        
    async def rag_query(self, query: str, context_limit: int = 5,
                       system_prompt: Optional[str] = None) -> str:
        """Retrieval Augmented Generation using AWS Bedrock"""
        if not self.bedrock:
            raise RuntimeError("Bedrock client not available. AI features are disabled.")
            
        # Retrieve relevant documents
        relevant_docs = await self.semantic_search(query, limit=context_limit)
        
        # Build context
        context = "\n\n".join([
            f"Document {i+1}: {doc.get('content', doc.get('text', str(doc)))}"
            for i, doc in enumerate(relevant_docs)
        ])
        
        # Build prompt
        if not system_prompt:
            system_prompt = "You are a helpful assistant. Use the provided context to answer questions."
            
        prompt = f"{system_prompt}\n\nContext:\n{context}\n\nQuestion: {query}\n\nAnswer:"
        
        # Generate response using Bedrock
        try:
            response = self.bedrock.invoke_model(
                modelId=self.llm_model,
                body=json.dumps({
                    "prompt": prompt,
                    "max_tokens_to_sample": 500,
                    "temperature": 0.7
                })
            )
            
            result = json.loads(response['body'].read())
            return result['completion']
        except Exception as e:
            logger.error(f"Error in RAG generation: {e}")
            raise
            
    async def create_vector_index(self, field: str = "embedding",
                                index_name: str = "vector_index") -> Dict[str, Any]:
        """Create Atlas Vector Search index"""
        index_def = {
            "name": index_name,
            "type": "vectorSearch",
            "definition": {
                "fields": [{
                    "type": "vector",
                    "path": field,
                    "numDimensions": 1536,  # Adjust based on your embedding model
                    "similarity": "cosine"
                }]
            }
        }
        
        # Note: This requires Atlas API or manual creation
        # Return the definition for manual creation
        return index_def

# ==================== REAL-TIME PROCESSING ====================

class RealTimeProcessor:
    """Handle change streams and real-time data processing"""
    
    def __init__(self, collection: Union[AsyncIOMotorCollection, Any]):
        self.collection = collection
        self.handlers: Dict[ChangeStreamOperation, List[Callable]] = defaultdict(list)
        self.running = False
        
    def on(self, operation: ChangeStreamOperation, handler: Callable) -> None:
        """Register a handler for specific operations"""
        self.handlers[operation].append(handler)
        
    async def start(self, pipeline: Optional[List[Dict[str, Any]]] = None,
                   full_document: str = "updateLookup") -> None:
        """Start watching change stream"""
        self.running = True
        
        async with self.collection.watch(
            pipeline=pipeline,
            full_document=full_document
        ) as change_stream:
            while self.running:
                try:
                    async for change in change_stream:
                        await self._process_change(change)
                except Exception as e:
                    logger.error(f"Error in change stream: {e}")
                    if not self.running:
                        break
                    await asyncio.sleep(1)  # Brief pause before retry
                    
    async def stop(self) -> None:
        """Stop watching change stream"""
        self.running = False
        
    async def _process_change(self, change: Dict[str, Any]) -> None:
        """Process a single change event"""
        operation = ChangeStreamOperation(change["operationType"])
        
        # Call registered handlers
        for handler in self.handlers[operation]:
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(change)
                else:
                    handler(change)
            except Exception as e:
                logger.error(f"Error in change handler: {e}")
                
    async def aggregate_window(self, window_seconds: int,
                             aggregation_func: Callable) -> AsyncIterator[Any]:
        """Aggregate changes over time windows"""
        window_data = []
        window_start = datetime.utcnow()
        
        async def window_handler(change):
            nonlocal window_data, window_start
            
            window_data.append(change)
            
            if (datetime.utcnow() - window_start).total_seconds() >= window_seconds:
                result = await aggregation_func(window_data)
                window_data = []
                window_start = datetime.utcnow()
                return result
                
        self.on(ChangeStreamOperation.INSERT, window_handler)
        self.on(ChangeStreamOperation.UPDATE, window_handler)
        
        await self.start()

# ==================== DATA VALIDATION ====================

class DataValidator:
    """Schema validation and data quality management"""
    
    def __init__(self, collection: Union[AsyncIOMotorCollection, Any]):
        self.collection = collection
        
    async def set_validation_rules(self, schema: Dict[str, Any]) -> None:
        """Set JSON Schema validation rules"""
        await self.collection.database.command({
            "collMod": self.collection.name,
            "validator": {"$jsonSchema": schema}
        })
        
    async def validate_document(self, document: Dict[str, Any],
                              schema: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """Validate a single document against schema"""
        errors = []
        
        # Check required fields
        if "required" in schema:
            for field in schema["required"]:
                if field not in document:
                    errors.append(f"Missing required field: {field}")
                    
        # Check field types
        if "properties" in schema:
            for field, spec in schema["properties"].items():
                if field in document:
                    if not self._validate_type(document[field], spec.get("type")):
                        errors.append(f"Invalid type for field {field}")
                        
        return len(errors) == 0, errors
        
    def _validate_type(self, value: Any, expected_type: str) -> bool:
        """Validate value type"""
        type_map = {
            "string": str,
            "number": (int, float),
            "integer": int,
            "boolean": bool,
            "array": list,
            "object": dict
        }
        
        if expected_type in type_map:
            return isinstance(value, type_map[expected_type])
        return True
        
    async def analyze_data_quality(self) -> Dict[str, Any]:
        """Analyze overall data quality"""
        pipeline = [
            {"$sample": {"size": 1000}},  # Sample for performance
            {"$project": {
                "fields": {"$objectToArray": "$$ROOT"},
                "doc_size": {"$bsonSize": "$$ROOT"}
            }},
            {"$unwind": "$fields"},
            {"$group": {
                "_id": "$fields.k",
                "count": {"$sum": 1},
                "null_count": {
                    "$sum": {"$cond": [{"$eq": ["$fields.v", None]}, 1, 0]}
                },
                "types": {"$addToSet": {"$type": "$fields.v"}},
                "avg_size": {"$avg": "$doc_size"}
            }}
        ]
        
        results = await self.collection.aggregate(pipeline).to_list(None)
        
        return {
            "field_analysis": results,
            "total_fields": len(results),
            "quality_score": self._calculate_quality_score(results)
        }
        
    def _calculate_quality_score(self, field_analysis: List[Dict[str, Any]]) -> float:
        """Calculate overall quality score"""
        if not field_analysis:
            return 0.0
            
        scores = []
        for field in field_analysis:
            # Penalize null values
            null_ratio = field["null_count"] / field["count"]
            null_score = 1 - null_ratio
            
            # Penalize mixed types
            type_score = 1.0 if len(field["types"]) == 1 else 0.5
            
            scores.append((null_score + type_score) / 2)
            
        return sum(scores) / len(scores)

# ==================== UNIFIED REPOSITORY ====================

class MongoDBRepository:
    """Unified repository combining all MongoDB features"""
    
    def __init__(self, connection_string: str, database_name: str,
                 bedrock_client: Optional[boto3.client] = None):
        self.client = AsyncIOMotorClient(connection_string)
        self.db = self.client[database_name]
        self.bedrock_client = bedrock_client
        
        # Component instances
        self._components: Dict[str, Any] = {}
        
    def collection(self, name: str) -> AsyncIOMotorCollection:
        """Get a collection"""
        return self.db[name]
        
    def aggregation(self) -> AggregationBuilder:
        """Get aggregation builder"""
        return AggregationBuilder()
        
    def geospatial(self, collection_name: str) -> GeospatialIntelligence:
        """Get geospatial operations for a collection"""
        key = f"geo_{collection_name}"
        if key not in self._components:
            self._components[key] = GeospatialIntelligence(self.collection(collection_name))
        return self._components[key]
        
    def graph(self, collection_name: str) -> GraphOperations:
        """Get graph operations for a collection"""
        key = f"graph_{collection_name}"
        if key not in self._components:
            self._components[key] = GraphOperations(self.collection(collection_name))
        return self._components[key]
        
    def ai_search(self, collection_name: str) -> AIVectorSearch:
        """Get AI/vector search for a collection"""
        key = f"ai_{collection_name}"
        if key not in self._components:
            self._components[key] = AIVectorSearch(
                self.collection(collection_name),
                self.bedrock_client
            )
        return self._components[key]
        
    def realtime(self, collection_name: str) -> RealTimeProcessor:
        """Get real-time processor for a collection"""
        key = f"realtime_{collection_name}"
        if key not in self._components:
            self._components[key] = RealTimeProcessor(self.collection(collection_name))
        return self._components[key]
        
    def validator(self, collection_name: str) -> DataValidator:
        """Get data validator for a collection"""
        key = f"validator_{collection_name}"
        if key not in self._components:
            self._components[key] = DataValidator(self.collection(collection_name))
        return self._components[key]
        
    async def execute_pipeline(self, collection_name: str,
                             pipeline: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Execute an aggregation pipeline"""
        collection = self.collection(collection_name)
        return await collection.aggregate(pipeline).to_list(None)
        
    async def bulk_write(self, collection_name: str,
                        operations: List[Union[InsertOne, UpdateOne, DeleteOne]],
                        ordered: bool = True) -> Dict[str, Any]:
        """Execute bulk write operations"""
        collection = self.collection(collection_name)
        try:
            result = await collection.bulk_write(operations, ordered=ordered)
            return {
                "inserted": result.inserted_count,
                "updated": result.modified_count,
                "deleted": result.deleted_count
            }
        except BulkWriteError as e:
            return {
                "errors": e.details,
                "inserted": e.details.get("nInserted", 0),
                "updated": e.details.get("nModified", 0)
            }
            
    async def create_indexes(self, collection_name: str,
                           indexes: List[Tuple[str, Any]]) -> List[str]:
        """Create multiple indexes"""
        collection = self.collection(collection_name)
        created = []
        
        for field, index_type in indexes:
            name = await collection.create_index([(field, index_type)])
            created.append(name)
            
        return created
        
    async def close(self) -> None:
        """Close MongoDB connection"""
        self.client.close()

# ==================== EXAMPLE USAGE ====================

async def example_usage():
    """Example usage of the MongoDB Core Library"""
    
    # Initialize repository
    repo = MongoDBRepository(
        connection_string="mongodb://localhost:27017",
        database_name="demo_db"
    )
    
    # 1. Advanced Aggregation Example
    pipeline = (repo.aggregation()
        .match({"status": "active"})
        .lookup("orders", "user_id", "_id", "user_orders")
        .unwind("$user_orders")
        .group({
            "_id": "$user_id",
            "total_orders": {"$sum": 1},
            "total_amount": {"$sum": "$user_orders.amount"}
        })
        .sort({"total_amount": -1})
        .limit(10)
        .build()
    )
    
    top_users = await repo.execute_pipeline("users", pipeline)
    
    # 2. Geospatial Example
    geo = repo.geospatial("locations")
    
    # Find nearby locations
    user_location = GeoPoint(longitude=-73.935242, latitude=40.730610)
    nearby = await geo.find_nearby(user_location, max_distance=1000)
    
    # 3. Graph Operations Example
    graph = repo.graph("social_network")
    
    # Find connections
    user_id = ObjectId()
    connections = await graph.find_connections(user_id, "friends", max_depth=2)
    
    # 4. AI/Vector Search Example
    ai = repo.ai_search("products")
    
    # Semantic search
    results = await ai.semantic_search("comfortable running shoes", limit=5)
    
    # RAG query
    answer = await ai.rag_query("What are the best shoes for marathon training?")
    
    # 5. Real-time Processing Example
    realtime = repo.realtime("events")
    
    # Register handlers
    async def on_insert(change):
        print(f"New event: {change['fullDocument']}")
        
    realtime.on(ChangeStreamOperation.INSERT, on_insert)
    
    # Start monitoring (in background)
    # asyncio.create_task(realtime.start())
    
    # 6. Data Validation Example
    validator = repo.validator("users")
    
    # Set validation schema
    schema = {
        "bsonType": "object",
        "required": ["email", "username"],
        "properties": {
            "email": {"bsonType": "string", "pattern": "^.+@.+$"},
            "username": {"bsonType": "string", "minLength": 3},
            "age": {"bsonType": "int", "minimum": 0, "maximum": 150}
        }
    }
    
    await validator.set_validation_rules(schema)
    
    # Analyze data quality
    quality_report = await validator.analyze_data_quality()
    
    # Close connection
    await repo.close()

if __name__ == "__main__":
    asyncio.run(example_usage())
