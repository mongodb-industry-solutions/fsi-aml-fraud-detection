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
from repositories import entity_fields as ef


class TransactionRepository:
    """MongoDB transaction repository implementation"""

    def __init__(self, transactions_collection: AsyncIOMotorCollection,
                 customers_collection: AsyncIOMotorCollection):
        self.transactions_collection = transactions_collection
        self.customers_collection = customers_collection

    async def _entity_lookup(self, entity_ids) -> Dict[str, Dict[str, Optional[str]]]:
        """Map `customerId` -> {name, type} for counterparty/node rendering.

        `fraudEvaluation` docs carry the join keys (`fromEntityId`/`toEntityId` ==
        `customers.customerId`) but not a current name/type -- those live on
        `customers`. Each doc's `sourceEntities.*` sub-document is a pre-migration
        snapshot (old entity id, old name) and must NOT be read as the source of
        truth here -- same rule entity_fields.py applies everywhere else.
        """
        ids = list({e for e in entity_ids if e})
        if not ids:
            return {}
        cursor = self.customers_collection.find(
            {ef.CUSTOMER_ID: {"$in": ids}},
            {ef.CUSTOMER_ID: 1, "identification.fullName": 1, ef.TYPE: 1},
        )
        docs = await cursor.to_list(length=None)
        return {ef.id_of(d): {"name": ef.name_of(d), "type": ef.type_of(d)} for d in docs}

    async def get_by_transaction_id(self, transaction_id: str) -> Optional[Dict[str, Any]]:
        """Fetch one `fraudEvaluation` document by its business key.

        `transactionId` is the collection's unique index and the migration's declared
        upsert key (`populate_leafy_bank_bian.py`), so this is a single-document lookup,
        not a filter.

        Every other read on this collection is entity-scoped (`fromEntityId`/`toEntityId`)
        or a date-windowed aggregation; this is the only by-id primitive, added to back the
        BIAN `FraudEvaluation/{id}/Retrieve` operation. Returns the stored document as-is —
        already camelCase and BIAN-shaped — with `_id` projected out.
        """
        return await self.transactions_collection.find_one(
            {"transactionId": transaction_id},
            {"_id": 0},
        )

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
                    }
                    # counterparty_name/type come from a `customers` lookup below --
                    # fraudEvaluation has no current name/type field, only the
                    # pre-migration snapshot under sourceEntities.*.
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

        counterparty_lookup = await self._entity_lookup(
            t["counterparty_id"] for t in transactions_data
        )

        # Convert to TransactionActivity objects
        transactions = []
        for txn_data in transactions_data:
            counterparty = counterparty_lookup.get(txn_data["counterparty_id"], {})
            model_results = txn_data.get("modelResults", {})
            transaction = TransactionActivity(
                transaction_id=txn_data["transactionId"],
                counterparty_id=txn_data["counterparty_id"],
                counterparty_name=counterparty.get("name") or "Unknown",
                counterparty_type=counterparty.get("type") or "unknown",
                direction=txn_data["direction"],
                amount=txn_data["amount"],
                currency=txn_data["currency"],
                transaction_type=txn_data["transactionType"],
                payment_method=txn_data.get("paymentRail", "unknown"),
                timestamp=txn_data["timestamp"],
                status=txn_data["status"],
                channel=txn_data["channel"],
                description=txn_data["description"],
                risk_score=model_results.get("riskScore", 0),
                flagged=model_results.get("flagged", False),
                tags=txn_data.get("ruleResults", {}).get("tags", [])
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

        # Names/types come from `customers`, not the transaction doc -- see
        # _entity_lookup docstring.
        entity_lookup = await self._entity_lookup(
            eid for txn in all_transactions for eid in (txn["fromEntityId"], txn["toEntityId"])
        )

        def _name(eid):
            return entity_lookup.get(eid, {}).get("name") or "Unknown"

        def _type(eid):
            return entity_lookup.get(eid, {}).get("type") or "unknown"

        # Step 3: Build nodes (entities) with aggregated metrics
        entity_metrics = {}
        all_entities = set()

        for txn in all_transactions:
            from_id = txn["fromEntityId"]
            to_id = txn["toEntityId"]
            amount = txn["amount"]
            risk_score = txn.get("modelResults", {}).get("riskScore", 0)

            # Track all entities
            all_entities.add((from_id, _name(from_id), _type(from_id)))
            all_entities.add((to_id, _name(to_id), _type(to_id)))

            # Initialize entity metrics if not exists
            for entity_id, name, entity_type in [(from_id, _name(from_id), _type(from_id)),
                                                  (to_id, _name(to_id), _type(to_id))]:
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
            metrics["risk_scores"].append(txn.get("modelResults", {}).get("riskScore", 0))
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