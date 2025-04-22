# Import all routers to make them available
from .customer import router as customer_router
from .transaction import router as transaction_router
from .fraud_pattern import router as fraud_pattern_router
from .model_management import router as model_management_router