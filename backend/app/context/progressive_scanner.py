"""
UPI Rakshak - Module E: Progressive Conversation Risk Assessment Engine
Tracks sequential conversational escalation message-by-message in simulated or progressive dialogue.
"""

from typing import List
try:
    from app.context.schemas import (
        ProgressiveMessageInput,
        ProgressiveScanStep,
        ProgressiveScanResponse,
    )
    from app.context.conversation_intelligence import conversation_engine
except ImportError:
    from backend.app.context.schemas import (
        ProgressiveMessageInput,
        ProgressiveScanStep,
        ProgressiveScanResponse,
    )
    from backend.app.context.conversation_intelligence import conversation_engine


class ProgressiveScanner:
    """
    Evaluates risk progressively across turns of a conversation,
    mapping threat escalation trajectories.
    """

    def scan_progressive(self, messages: List[ProgressiveMessageInput]) -> ProgressiveScanResponse:
        if not messages:
            empty_analysis = conversation_engine.analyze("")
            return ProgressiveScanResponse(
                total_messages=0,
                current_risk_score=0,
                current_risk_level="LOW",
                primary_scam_category="Legitimate",
                threat_trajectory="STABLE",
                steps=[],
                final_analysis=empty_analysis,
            )

        # Defense-in-depth: cap to 50 turns to prevent quadratic regex CPU exhaustion
        bounded_messages = messages[:50]
        steps: List[ProgressiveScanStep] = []
        cumulative_text_list: List[str] = []
        prev_score = 0
        seen_signal_ids = set()

        for idx, msg in enumerate(bounded_messages):
            cumulative_text_list.append(msg.text)
            current_combined_text = " \n".join(cumulative_text_list)
            step_analysis = conversation_engine.analyze(current_combined_text)

            step_score = step_analysis.context_risk_score

            if step_score >= 80:
                step_level = "CRITICAL"
            elif step_score >= 60:
                step_level = "HIGH"
            elif step_score >= 30:
                step_level = "MEDIUM"
            else:
                step_level = "LOW"

            # Determine new signals added in this turn
            new_sigs = []
            for s in step_analysis.signals:
                if s.category not in seen_signal_ids:
                    new_sigs.append(s)
                    seen_signal_ids.add(s.category)

            # Determine trajectory
            if step_score > prev_score + 5:
                trajectory = "ESCALATING"
            elif step_score < prev_score - 5:
                trajectory = "DE-ESCALATING"
            else:
                trajectory = "STABLE"

            prev_score = step_score

            step_obj = ProgressiveScanStep(
                message_id=msg.id,
                message_text=msg.text,
                sender=msg.sender,
                step_risk_score=step_score,
                step_risk_level=step_level,
                new_signals=new_sigs,
                cumulative_signals=step_analysis.signals,
                threat_trajectory=trajectory,
            )
            steps.append(step_obj)

        final_step = steps[-1]
        overall_trajectory = "ESCALATING" if steps[-1].step_risk_score > steps[0].step_risk_score else "STABLE"

        full_analysis = conversation_engine.analyze(" \n".join(m.text for m in messages))

        return ProgressiveScanResponse(
            total_messages=len(messages),
            current_risk_score=final_step.step_risk_score,
            current_risk_level=final_step.step_risk_level,
            primary_scam_category=full_analysis.scam_category,
            threat_trajectory=overall_trajectory,
            steps=steps,
            final_analysis=full_analysis,
        )


# Global singleton
progressive_scanner = ProgressiveScanner()

