# backend/routes/feedbackservice.py

from fastapi import APIRouter, HTTPException
from models.schemas import RouteFeedbackRequest, FeedbackResponse
from services.riskscoreservice import update_segment_score

router = APIRouter(
    prefix="/feedback",
    tags=["Feedback"]
)

@router.post("/route-review", response_model=FeedbackResponse)
async def submit_route_feedback(request: RouteFeedbackRequest):
    """
    Submits feedback for a completed route.
    Updates segment scores based on user ratings.
    """
    try:
        updated_count = 0
        
        # Update segments with specific feedback
        for seg_feedback in request.segment_feedback:
            update_segment_score(
                segment_id=seg_feedback.segment_id,
                new_rating=seg_feedback.rating
            )
            updated_count += 1
        
        print(f"[FEEDBACK] Updated {updated_count} segments from route feedback")
        
        return FeedbackResponse(
            success=True,
            message=f"Thank you for your feedback! Updated {updated_count} street segments.",
            updated_segments=updated_count
        )
        
    except Exception as e:
        print(f"[FEEDBACK] Error processing feedback: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process feedback: {str(e)}"
        )


@router.get("/segment/{segment_id}")
async def get_segment_info(segment_id: int):
    """
    Get information about a specific segment.
    """
    from services.riskscoreservice import get_segment_score
    
    seg_data = get_segment_score(segment_id)
    
    if not seg_data or seg_data.get('segment_id') != segment_id:
        raise HTTPException(
            status_code=404,
            detail=f"Segment {segment_id} not found"
        )
    
    return seg_data
