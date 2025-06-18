"""
Confidence Service - Confidence scoring algorithms and validation

Stateless service focused on confidence calculation, threshold management,
and statistical confidence analysis for entity resolution.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)


class ConfidenceThreshold(Enum):
    """Confidence threshold levels for different operations"""
    LOW = 0.3
    MEDIUM = 0.6
    HIGH = 0.8
    CRITICAL = 0.9


class ConfidenceService:
    """
    Confidence scoring service - stateless business logic
    
    Handles confidence calculation algorithms, threshold management,
    and statistical confidence analysis without direct data access.
    """
    
    def __init__(self):
        """Initialize Confidence service"""
        # Confidence calculation weights
        self.attribute_weights = {
            "name": 0.35,
            "identifiers": 0.30,
            "contact": 0.20,
            "demographic": 0.15
        }
        
        # Match quality multipliers
        self.quality_multipliers = {
            "exact": 1.0,
            "fuzzy": 0.8,
            "partial": 0.5,
            "weak": 0.3
        }
        
        # Resolution decision thresholds
        self.decision_thresholds = {
            "auto_confirm": 0.9,
            "manual_review": 0.6,
            "likely_reject": 0.3
        }
        
        logger.info("Confidence service initialized with scoring algorithms")
    
    # ==================== CONFIDENCE CALCULATION METHODS ====================
    
    def calculate_match_confidence(self, match_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate comprehensive confidence score for entity match
        
        Args:
            match_analysis: Analysis results from MatchingService
            
        Returns:
            Dictionary containing confidence score and breakdown
        """
        try:
            logger.info("Calculating match confidence from analysis")
            
            if not match_analysis or "similarity_scores" not in match_analysis:
                return self._create_zero_confidence_result("No match analysis provided")
            
            similarity_scores = match_analysis["similarity_scores"]
            matched_attributes = match_analysis.get("matched_attributes", [])
            partial_matches = match_analysis.get("partial_matches", [])
            
            # Calculate weighted confidence score
            weighted_score = self._calculate_weighted_score(similarity_scores, matched_attributes, partial_matches)
            
            # Apply quality adjustments
            quality_adjusted_score = self._apply_quality_adjustments(weighted_score, match_analysis)
            
            # Calculate statistical confidence
            statistical_confidence = self._calculate_statistical_confidence(match_analysis)
            
            # Combine scores with weights
            final_confidence = (
                quality_adjusted_score * 0.7 + 
                statistical_confidence * 0.3
            )
            
            # Generate confidence breakdown
            confidence_breakdown = self._generate_confidence_breakdown(
                weighted_score, quality_adjusted_score, statistical_confidence, final_confidence
            )
            
            # Determine confidence level and recommendation
            confidence_level = self._determine_confidence_level(final_confidence)
            recommendation = self._generate_recommendation(final_confidence, match_analysis)
            
            result = {
                "confidence_score": round(final_confidence, 3),
                "confidence_level": confidence_level,
                "recommendation": recommendation,
                "breakdown": confidence_breakdown,
                "threshold_analysis": self._analyze_thresholds(final_confidence),
                "quality_indicators": self._generate_quality_indicators(match_analysis)
            }
            
            logger.info(f"Confidence calculation complete. Score: {final_confidence:.3f}, Level: {confidence_level}")
            return result
            
        except Exception as e:
            logger.error(f"Error calculating match confidence: {e}")
            return self._create_zero_confidence_result(f"Calculation error: {str(e)}")
    
    def _calculate_weighted_score(self, similarity_scores: Dict[str, float], 
                                 matched_attributes: List[str], 
                                 partial_matches: List[str]) -> float:
        """Calculate weighted confidence score based on attribute importance"""
        try:
            total_weight = 0.0
            weighted_sum = 0.0
            
            for attribute, score in similarity_scores.items():
                if attribute in self.attribute_weights:
                    weight = self.attribute_weights[attribute]
                    
                    # Apply match quality multiplier
                    if attribute in matched_attributes:
                        multiplier = self.quality_multipliers["exact"]
                    elif attribute in partial_matches:
                        multiplier = self.quality_multipliers["partial"]
                    else:
                        multiplier = self.quality_multipliers["weak"]
                    
                    adjusted_score = score * multiplier
                    weighted_sum += adjusted_score * weight
                    total_weight += weight
            
            return weighted_sum / total_weight if total_weight > 0 else 0.0
            
        except Exception as e:
            logger.error(f"Error calculating weighted score: {e}")
            return 0.0
    
    def _apply_quality_adjustments(self, base_score: float, match_analysis: Dict[str, Any]) -> float:
        """Apply quality adjustments based on match characteristics"""
        try:
            adjusted_score = base_score
            
            # Boost for multiple matched attributes
            matched_count = len(match_analysis.get("matched_attributes", []))
            if matched_count >= 3:
                adjusted_score *= 1.1  # 10% boost
            elif matched_count >= 2:
                adjusted_score *= 1.05  # 5% boost
            
            # Penalty for no exact matches, only partial
            if not match_analysis.get("matched_attributes") and match_analysis.get("partial_matches"):
                adjusted_score *= 0.8  # 20% penalty
            
            # Boost for high overall similarity
            overall_score = match_analysis.get("overall_match_score", 0.0)
            if overall_score >= 0.9:
                adjusted_score *= 1.05  # 5% boost for high similarity
            
            return min(1.0, adjusted_score)  # Cap at 1.0
            
        except Exception as e:
            logger.error(f"Error applying quality adjustments: {e}")
            return base_score
    
    def _calculate_statistical_confidence(self, match_analysis: Dict[str, Any]) -> float:
        """Calculate statistical confidence based on data completeness and consistency"""
        try:
            similarity_scores = match_analysis.get("similarity_scores", {})
            
            if not similarity_scores:
                return 0.0
            
            scores = list(similarity_scores.values())
            
            # Calculate variance (lower variance = higher consistency = higher confidence)
            mean_score = sum(scores) / len(scores)
            variance = sum((score - mean_score) ** 2 for score in scores) / len(scores)
            
            # Convert variance to confidence (inverse relationship)
            consistency_score = max(0.0, 1.0 - variance)
            
            # Factor in data completeness (more attributes = higher confidence)
            completeness_score = min(1.0, len(scores) / len(self.attribute_weights))
            
            # Combine consistency and completeness
            statistical_confidence = (consistency_score * 0.6 + completeness_score * 0.4)
            
            return statistical_confidence
            
        except Exception as e:
            logger.error(f"Error calculating statistical confidence: {e}")
            return 0.0
    
    # ==================== CONFIDENCE ANALYSIS METHODS ====================
    
    def _determine_confidence_level(self, confidence_score: float) -> str:
        """Determine confidence level category"""
        if confidence_score >= ConfidenceThreshold.CRITICAL.value:
            return "CRITICAL"
        elif confidence_score >= ConfidenceThreshold.HIGH.value:
            return "HIGH"
        elif confidence_score >= ConfidenceThreshold.MEDIUM.value:
            return "MEDIUM"
        elif confidence_score >= ConfidenceThreshold.LOW.value:
            return "LOW"
        else:
            return "VERY_LOW"
    
    def _generate_recommendation(self, confidence_score: float, match_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Generate resolution recommendation based on confidence"""
        try:
            recommendation = {
                "action": "NEEDS_REVIEW",
                "reasoning": [],
                "suggested_next_steps": []
            }
            
            if confidence_score >= self.decision_thresholds["auto_confirm"]:
                recommendation["action"] = "AUTO_CONFIRM"
                recommendation["reasoning"].append("High confidence match with strong attribute alignment")
                recommendation["suggested_next_steps"].append("Proceed with automatic merge")
                
            elif confidence_score >= self.decision_thresholds["manual_review"]:
                recommendation["action"] = "MANUAL_REVIEW"
                recommendation["reasoning"].append("Moderate confidence match requiring human validation")
                recommendation["suggested_next_steps"].extend([
                    "Review matched attributes manually",
                    "Verify identity documents if available",
                    "Consider additional data sources"
                ])
                
            elif confidence_score >= self.decision_thresholds["likely_reject"]:
                recommendation["action"] = "LIKELY_REJECT"
                recommendation["reasoning"].append("Low confidence match with weak attribute alignment")
                recommendation["suggested_next_steps"].extend([
                    "Investigate potential false positive",
                    "Review search criteria",
                    "Consider expanding matching parameters"
                ])
                
            else:
                recommendation["action"] = "REJECT"
                recommendation["reasoning"].append("Very low confidence - likely not a match")
                recommendation["suggested_next_steps"].append("Mark as not a match")
            
            # Add specific reasoning based on match analysis
            matched_attrs = match_analysis.get("matched_attributes", [])
            if "identifiers" in matched_attrs:
                recommendation["reasoning"].append("Strong identifier match increases confidence")
            if "name" in matched_attrs:
                recommendation["reasoning"].append("Name match provides good foundation")
            
            return recommendation
            
        except Exception as e:
            logger.error(f"Error generating recommendation: {e}")
            return {
                "action": "NEEDS_REVIEW",
                "reasoning": ["Error in recommendation generation"],
                "suggested_next_steps": ["Manual review required"]
            }
    
    def _analyze_thresholds(self, confidence_score: float) -> Dict[str, Any]:
        """Analyze how confidence score relates to decision thresholds"""
        return {
            "above_auto_confirm": confidence_score >= self.decision_thresholds["auto_confirm"],
            "above_manual_review": confidence_score >= self.decision_thresholds["manual_review"],
            "above_likely_reject": confidence_score >= self.decision_thresholds["likely_reject"],
            "distance_to_auto_confirm": self.decision_thresholds["auto_confirm"] - confidence_score,
            "distance_to_manual_review": self.decision_thresholds["manual_review"] - confidence_score,
            "thresholds": self.decision_thresholds
        }
    
    def _generate_confidence_breakdown(self, weighted_score: float, quality_adjusted: float, 
                                     statistical: float, final: float) -> Dict[str, Any]:
        """Generate detailed confidence score breakdown"""
        return {
            "weighted_attribute_score": round(weighted_score, 3),
            "quality_adjusted_score": round(quality_adjusted, 3),
            "statistical_confidence": round(statistical, 3),
            "final_confidence": round(final, 3),
            "score_components": {
                "attribute_matching": round(quality_adjusted * 0.7, 3),
                "statistical_analysis": round(statistical * 0.3, 3)
            },
            "quality_adjustments_applied": round(quality_adjusted - weighted_score, 3)
        }
    
    def _generate_quality_indicators(self, match_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Generate quality indicators for the match"""
        return {
            "data_completeness": len(match_analysis.get("similarity_scores", {})) / len(self.attribute_weights),
            "attribute_coverage": {
                "matched": len(match_analysis.get("matched_attributes", [])),
                "partial": len(match_analysis.get("partial_matches", [])),
                "no_match": len(match_analysis.get("no_matches", []))
            },
            "consistency_score": self._calculate_consistency_score(match_analysis),
            "strength_distribution": self._analyze_strength_distribution(match_analysis)
        }
    
    def _calculate_consistency_score(self, match_analysis: Dict[str, Any]) -> float:
        """Calculate consistency score across different attributes"""
        try:
            scores = list(match_analysis.get("similarity_scores", {}).values())
            if len(scores) < 2:
                return 1.0  # Can't measure consistency with fewer than 2 scores
            
            mean_score = sum(scores) / len(scores)
            variance = sum((score - mean_score) ** 2 for score in scores) / len(scores)
            
            # Lower variance = higher consistency
            return max(0.0, 1.0 - variance)
            
        except Exception as e:
            logger.error(f"Error calculating consistency score: {e}")
            return 0.0
    
    def _analyze_strength_distribution(self, match_analysis: Dict[str, Any]) -> Dict[str, int]:
        """Analyze the distribution of match strengths"""
        try:
            scores = list(match_analysis.get("similarity_scores", {}).values())
            
            strong_matches = sum(1 for score in scores if score >= 0.8)
            moderate_matches = sum(1 for score in scores if 0.5 <= score < 0.8)
            weak_matches = sum(1 for score in scores if score < 0.5)
            
            return {
                "strong": strong_matches,
                "moderate": moderate_matches,
                "weak": weak_matches
            }
            
        except Exception as e:
            logger.error(f"Error analyzing strength distribution: {e}")
            return {"strong": 0, "moderate": 0, "weak": 0}
    
    # ==================== UTILITY METHODS ====================
    
    def _create_zero_confidence_result(self, reason: str) -> Dict[str, Any]:
        """Create zero confidence result with error reason"""
        return {
            "confidence_score": 0.0,
            "confidence_level": "VERY_LOW",
            "recommendation": {
                "action": "REJECT",
                "reasoning": [reason],
                "suggested_next_steps": ["Review input data and retry"]
            },
            "breakdown": {
                "weighted_attribute_score": 0.0,
                "quality_adjusted_score": 0.0,
                "statistical_confidence": 0.0,
                "final_confidence": 0.0
            },
            "threshold_analysis": {
                "above_auto_confirm": False,
                "above_manual_review": False,
                "above_likely_reject": False
            },
            "quality_indicators": {
                "data_completeness": 0.0,
                "attribute_coverage": {"matched": 0, "partial": 0, "no_match": 0}
            },
            "error": reason
        }
    
    # ==================== CONFIGURATION METHODS ====================
    
    def update_attribute_weights(self, new_weights: Dict[str, float]) -> bool:
        """Update attribute weights for confidence calculation"""
        try:
            # Validate weights sum to 1.0
            total_weight = sum(new_weights.values())
            if abs(total_weight - 1.0) > 0.01:  # Allow small rounding errors
                logger.error(f"Attribute weights must sum to 1.0, got {total_weight}")
                return False
            
            self.attribute_weights.update(new_weights)
            logger.info("Attribute weights updated successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error updating attribute weights: {e}")
            return False
    
    def update_decision_thresholds(self, new_thresholds: Dict[str, float]) -> bool:
        """Update decision thresholds"""
        try:
            # Validate threshold ordering
            thresholds = {**self.decision_thresholds, **new_thresholds}
            if not (thresholds["likely_reject"] < thresholds["manual_review"] < thresholds["auto_confirm"]):
                logger.error("Decision thresholds must be in ascending order")
                return False
            
            self.decision_thresholds.update(new_thresholds)
            logger.info("Decision thresholds updated successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error updating decision thresholds: {e}")
            return False