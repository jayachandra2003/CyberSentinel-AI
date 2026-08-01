import logging
import sys
from app.core.config import settings


def setup_logging() -> logging.Logger:
    """Configures structured enterprise logger."""
    log_level = logging.DEBUG if settings.DEBUG else logging.INFO
    
    logger = logging.getLogger("cybersentinel")
    logger.setLevel(log_level)
    
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            '[%(asctime)s] [%(levelname)s] [%(name)s:%(lineno)d]: %(message)s',
            datefmt='%Y-%m-%dT%H:%M:%SZ'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
    return logger


logger = setup_logging()
