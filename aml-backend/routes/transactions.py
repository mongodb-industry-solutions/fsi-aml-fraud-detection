"""
Transaction Routes - API endpoints for transaction activity and network analysis

Routes for retrieving transaction history and building transaction networks
for entities using the transactionsv2 collection.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional

from models.core.transaction import TransactionActivityResponse, TransactionNetwork
from repositories.impl.transaction_repository import TransactionRepository
from dependencies import get_database


router = APIRouter(
    prefix="/transactions",
    tags=["Transactions"],
    responses={
        400: {"description": "Bad request"},
        404: {"description": "Entity or transactions not found"},
        500: {"description": "Internal server error"}
    }
)


def get_transaction_repository() -> TransactionRepository:
    """Dependency to get transaction repository instance"""
    db = get_database()
    transactions_collection = db.transactionsv2
    return TransactionRepository(transactions_collection)


@router.get("/{entity_id}/transactions", response_model=TransactionActivityResponse)
async def get_entity_transactions(
    entity_id: str,
    limit: int = Query(50, ge=1, le=200, description="Number of transactions to return"),
    skip: int = Query(0, ge=0, description="Number of transactions to skip for pagination"),
    repository: TransactionRepository = Depends(get_transaction_repository)
):
    """
    Get paginated transaction activity for an entity
    
    Returns transaction history showing sent and received transactions
    with counterparty information, amounts, risk scores, and metadata.
    Uses existing MongoDB indexes for efficient querying.
    """
    try:
        result = await repository.get_entity_transactions(
            entity_id=entity_id,
            limit=limit,
            skip=skip
        )
        
        if not result.transactions and skip == 0:
            # No transactions found for this entity
            raise HTTPException(
                status_code=404,
                detail=f"No transactions found for entity {entity_id}"
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving transactions for entity {entity_id}: {str(e)}"
        )


@router.get("/{entity_id}/transaction_network", response_model=TransactionNetwork)
async def get_entity_transaction_network(
    entity_id: str,
    max_depth: int = Query(1, ge=1, le=4, description="Maximum network traversal depth"),
    repository: TransactionRepository = Depends(get_transaction_repository)
):
    """
    Get transaction network for an entity
    
    Builds a network graph showing transaction flows between entities
    using MongoDB $graphLookup for efficient traversal. Returns nodes
    (entities with transaction metrics) and edges (transaction flows).
    """
    try:
        result = await repository.build_transaction_network(
            entity_id=entity_id,
            max_depth=max_depth
        )
        
        if not result.nodes:
            # No network found for this entity
            raise HTTPException(
                status_code=404,
                detail=f"No transaction network found for entity {entity_id}"
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error building transaction network for entity {entity_id}: {str(e)}"
        )