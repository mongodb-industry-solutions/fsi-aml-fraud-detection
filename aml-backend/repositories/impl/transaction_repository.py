"""
Transaction Repository Implementation - MongoDB-based transaction operations

Repository for transaction activity and network analysis using the transactionsv2 collection.
Leverages existing indexes for efficient queries.
"""

import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorCollection
from pymongo import DESCENDING

from models.core.transaction import (
    TransactionActivity,
    TransactionNetwork,
    TransactionNetworkNode,
    TransactionNetworkEdge,
    TransactionActivityResponse
)


class TransactionRepository:
    """MongoDB transaction repository implementation"""
    
    def __init__(self, transactions_collection: AsyncIOMotorCollection):
        self.transactions_collection = transactions_collection
    
    async def get_entity_transactions(
        self,
        entity_id: str,
        limit: int = 50,
        skip: int = 0
    ) -> TransactionActivityResponse:
        """Get transaction activity for entity using existing indexes"""
        
        # Build aggregation pipeline to get transactions with counterparty info
        pipeline = [
            # Match transactions involving this entity (uses compound indexes)
            {
                "$match": {
                    "$or": [
                        {"fromEntityId": entity_id},
                        {"toEntityId": entity_id}
                    ]
                }
            },
            
            # Add computed fields for direction and counterparty
            {
                "$addFields": {
                    "direction": {
                        "$cond": [
                            {"$eq": ["$fromEntityId", entity_id]},
                            "sent",
                            "received"
                        ]
                    },
                    "counterparty_id": {
                        "$cond": [
                            {"$eq": ["$fromEntityId", entity_id]},
                            "$toEntityId",
                            "$fromEntityId"
                        ]
                    },
                    "counterparty_name": {
                        "$cond": [
                            {"$eq": ["$fromEntityId", entity_id]},
                            "$toEntityName",
                            "$fromEntityName"
                        ]
                    },
                    "counterparty_type": {
                        "$cond": [
                            {"$eq": ["$fromEntityId", entity_id]},
                            "$toEntityType",
                            "$fromEntityType"
                        ]
                    }
                }
            },
            
            # Sort by timestamp descending (uses timestamp index)
            {"$sort": {"timestamp": -1}},
            
            # Pagination
            {"$skip": skip},
            {"$limit": limit}
        ]
        
        # Execute aggregation
        cursor = self.transactions_collection.aggregate(pipeline)
        transactions_data = await cursor.to_list(length=None)
        
        # Get total count for pagination
        count_pipeline = [
            {
                "$match": {
                    "$or": [
                        {"fromEntityId": entity_id},
                        {"toEntityId": entity_id}
                    ]
                }
            },
            {"$count": "total"}
        ]
        
        count_result = await self.transactions_collection.aggregate(count_pipeline).to_list(length=1)
        total_count = count_result[0]["total"] if count_result else 0
        
        # Convert to TransactionActivity objects
        transactions = []
        for txn_data in transactions_data:
            transaction = TransactionActivity(
                transaction_id=txn_data["transactionId"],
                counterparty_id=txn_data["counterparty_id"],
                counterparty_name=txn_data["counterparty_name"],
                counterparty_type=txn_data["counterparty_type"],
                direction=txn_data["direction"],
                amount=txn_data["amount"],
                currency=txn_data["currency"],
                transaction_type=txn_data["transactionType"],
                payment_method=txn_data["paymentMethod"],
                timestamp=txn_data["timestamp"],
                status=txn_data["status"],
                channel=txn_data["channel"],
                description=txn_data["description"],
                risk_score=txn_data["riskScore"],
                flagged=txn_data["flagged"],
                tags=txn_data.get("tags", [])
            )
            transactions.append(transaction)
        
        return TransactionActivityResponse(
            entity_id=entity_id,
            transactions=transactions,
            total_count=total_count,
            page_size=limit,
            current_page=(skip // limit) + 1
        )
    
    async def build_transaction_network(
        self,
        entity_id: str,
        max_depth: int = 1
    ) -> TransactionNetwork:
        """Build transaction network using proper entity-based traversal"""
        
        # Step 1: Find entities connected to center entity by depth
        connected_entities = set([entity_id])  # Start with center entity
        
        for depth in range(max_depth):
            # Find entities connected to current level entities
            current_level_entities = list(connected_entities)
            
            # Get transactions involving current level entities
            level_pipeline = [
                {
                    "$match": {
                        "$or": [
                            {"fromEntityId": {"$in": current_level_entities}},
                            {"toEntityId": {"$in": current_level_entities}}
                        ]
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "connected_entities": {
                            "$addToSet": {
                                "$concatArrays": [
                                    ["$fromEntityId"],
                                    ["$toEntityId"]
                                ]
                            }
                        }
                    }
                },
                {
                    "$project": {
                        "all_entities": {
                            "$reduce": {
                                "input": "$connected_entities",
                                "initialValue": [],
                                "in": {"$setUnion": ["$$value", "$$this"]}
                            }
                        }
                    }
                }
            ]
            
            level_result = await self.transactions_collection.aggregate(level_pipeline).to_list(1)
            if level_result:
                new_entities = set(level_result[0].get("all_entities", []))
                connected_entities.update(new_entities)
        
        # Step 2: Get only transactions between entities in our connected set
        network_pipeline = [
            {
                "$match": {
                    "$and": [
                        {"fromEntityId": {"$in": list(connected_entities)}},
                        {"toEntityId": {"$in": list(connected_entities)}}
                    ]
                }
            }
        ]
        
        # Execute network query - only get transactions within our network
        network_cursor = self.transactions_collection.aggregate(network_pipeline)
        all_transactions = await network_cursor.to_list(length=None)
        
        # Step 3: Build nodes (entities) with aggregated metrics
        entity_metrics = {}
        all_entities = set()
        
        for txn in all_transactions:
            from_id = txn["fromEntityId"]
            to_id = txn["toEntityId"]
            amount = txn["amount"]
            risk_score = txn["riskScore"]
            
            # Track all entities
            all_entities.add((from_id, txn["fromEntityName"], txn["fromEntityType"]))
            all_entities.add((to_id, txn["toEntityName"], txn["toEntityType"]))
            
            # Initialize entity metrics if not exists
            for entity_id, name, entity_type in [(from_id, txn["fromEntityName"], txn["fromEntityType"]),
                                                  (to_id, txn["toEntityName"], txn["toEntityType"])]:
                if entity_id not in entity_metrics:
                    entity_metrics[entity_id] = {
                        "entity_name": name,
                        "entity_type": entity_type,
                        "total_sent": 0.0,
                        "total_received": 0.0,
                        "transaction_count": 0,
                        "risk_scores": []
                    }
            
            # Update sender metrics
            entity_metrics[from_id]["total_sent"] += amount
            entity_metrics[from_id]["transaction_count"] += 1
            entity_metrics[from_id]["risk_scores"].append(risk_score)
            
            # Update receiver metrics
            entity_metrics[to_id]["total_received"] += amount
            entity_metrics[to_id]["transaction_count"] += 1
            entity_metrics[to_id]["risk_scores"].append(risk_score)
        
        # Build network nodes
        nodes = []
        for entity_id, metrics in entity_metrics.items():
            avg_risk = sum(metrics["risk_scores"]) / len(metrics["risk_scores"]) if metrics["risk_scores"] else 0
            
            node = TransactionNetworkNode(
                entity_id=entity_id,
                entity_name=metrics["entity_name"],
                entity_type=metrics["entity_type"],
                total_sent=metrics["total_sent"],
                total_received=metrics["total_received"],
                transaction_count=metrics["transaction_count"],
                avg_risk_score=avg_risk
            )
            nodes.append(node)
        
        # Step 3: Build edges (transaction flows between entities)
        edge_metrics = {}
        
        for txn in all_transactions:
            from_id = txn["fromEntityId"]
            to_id = txn["toEntityId"]
            edge_key = f"{from_id}->{to_id}"
            
            if edge_key not in edge_metrics:
                edge_metrics[edge_key] = {
                    "from_entity_id": from_id,
                    "to_entity_id": to_id,
                    "transaction_count": 0,
                    "total_amount": 0.0,
                    "amounts": [],
                    "risk_scores": [],
                    "latest_transaction": None,
                    "transaction_types": [],
                    "currency": txn["currency"]
                }
            
            metrics = edge_metrics[edge_key]
            metrics["transaction_count"] += 1
            metrics["total_amount"] += txn["amount"]
            metrics["amounts"].append(txn["amount"])
            metrics["risk_scores"].append(txn["riskScore"])
            metrics["transaction_types"].append(txn["transactionType"])
            
            # Track latest transaction
            if not metrics["latest_transaction"] or txn["timestamp"] > metrics["latest_transaction"]:
                metrics["latest_transaction"] = txn["timestamp"]
        
        # Build network edges
        edges = []
        for metrics in edge_metrics.values():
            avg_amount = sum(metrics["amounts"]) / len(metrics["amounts"]) if metrics["amounts"] else 0
            avg_risk = sum(metrics["risk_scores"]) / len(metrics["risk_scores"]) if metrics["risk_scores"] else 0
            
            # Find most common transaction type
            type_counts = {}
            for txn_type in metrics["transaction_types"]:
                type_counts[txn_type] = type_counts.get(txn_type, 0) + 1
            primary_type = max(type_counts.keys(), key=type_counts.get) if type_counts else "unknown"
            
            edge = TransactionNetworkEdge(
                from_entity_id=metrics["from_entity_id"],
                to_entity_id=metrics["to_entity_id"],
                transaction_count=metrics["transaction_count"],
                total_amount=metrics["total_amount"],
                avg_amount=avg_amount,
                currency=metrics["currency"],
                avg_risk_score=avg_risk,
                latest_transaction=metrics["latest_transaction"],
                primary_transaction_type=primary_type
            )
            edges.append(edge)
        
        # Calculate network summary with distinction between total and center entity transactions
        total_transactions_in_network = len(all_transactions)
        total_volume_in_network = sum(txn["amount"] for txn in all_transactions)
        
        # Calculate transactions involving center entity only (for comparison with table)
        center_entity_transactions = [
            txn for txn in all_transactions 
            if txn["fromEntityId"] == entity_id or txn["toEntityId"] == entity_id
        ]
        center_entity_transaction_count = len(center_entity_transactions)
        center_entity_volume = sum(txn["amount"] for txn in center_entity_transactions)
        
        return TransactionNetwork(
            center_entity_id=entity_id,
            nodes=nodes,
            edges=edges,
            total_transactions=total_transactions_in_network,
            total_volume=total_volume_in_network,
            center_entity_transaction_count=center_entity_transaction_count,
            center_entity_volume=center_entity_volume,
            max_depth=max_depth
        )