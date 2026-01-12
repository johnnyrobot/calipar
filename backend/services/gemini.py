"""
Gemini AI Service for CALIPAR Platform.

Provides AI-powered features:
- Data trend analysis
- Bullet to narrative expansion
- Equity lens analysis
- Compliance Copilot (RAG chat)
- Socratic questioning mode
"""

import os
import json
import asyncio
from typing import Optional, List, Dict, Any, AsyncIterator

# Try to import google-genai, but allow graceful fallback
try:
    from google import genai
    from google.genai import types
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    genai = None
    types = None


class GeminiService:
    """
    Service class for Gemini AI integration.
    Falls back to mock responses if API key is not configured.
    """

    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY")
        self.file_search_store = os.getenv("GEMINI_FILE_SEARCH_STORE_NAME")
        self.client = None
        self.model_name = "gemini-2.0-flash"  # Fast, cost-effective model

        if GEMINI_AVAILABLE and self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                print(f"Warning: Failed to initialize Gemini client: {e}")
                self.client = None

    @property
    def is_available(self) -> bool:
        """Check if Gemini API is available."""
        return self.client is not None

    async def analyze_trends(
        self,
        data: Dict[str, Any],
        context: Optional[str] = None,
        focus_areas: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Analyze data trends and provide insights.

        Args:
            data: Dictionary containing enrollment, success, or other metrics
            context: Additional context about the program/department
            focus_areas: Specific areas to focus analysis on

        Returns:
            Dictionary with insights, trends, and recommendations
        """
        if not self.is_available:
            return self._mock_analyze_response()

        prompt = self._build_analyze_prompt(data, context, focus_areas)

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.3,
                    max_output_tokens=1024,
                ),
            )
            return self._parse_analyze_response(response.text)
        except Exception as e:
            print(f"Gemini analyze error: {e}")
            return self._mock_analyze_response()

    async def expand_narrative(
        self,
        bullets: List[str],
        context: Optional[str] = None,
        tone: str = "academic",
    ) -> Dict[str, Any]:
        """
        Expand bullet points into formal academic narrative.

        Args:
            bullets: List of bullet points to expand
            context: Context about the program review section
            tone: Writing tone (academic, professional, etc.)

        Returns:
            Dictionary with narrative text and word count
        """
        if not self.is_available:
            return self._mock_expand_response(bullets)

        prompt = f"""You are a higher education professional helping faculty write program review narratives for a community college, a Hispanic-Serving Institution (HSI).

Context: {context or 'Program Review narrative section'}
Tone: {tone}

Expand the following bullet points into a cohesive, formal academic narrative suitable for an accreditation program review. The narrative should:
1. Flow naturally between points
2. Use evidence-based language
3. Connect to institutional mission and equity goals where appropriate
4. Be written in third person
5. Be approximately 200-300 words

Bullet points:
{chr(10).join(f'- {b}' for b in bullets)}

Write the narrative:"""

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    max_output_tokens=1024,
                ),
            )
            narrative = response.text.strip()
            return {
                "narrative": narrative,
                "word_count": len(narrative.split()),
            }
        except Exception as e:
            print(f"Gemini expand error: {e}")
            return self._mock_expand_response(bullets)

    async def equity_check(
        self,
        section_content: Dict[str, Any],
        program_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Run equity lens analysis on review content.

        Args:
            section_content: Content of the review section
            program_data: Associated program metrics data

        Returns:
            Dictionary with gaps detected, suggestions, and ACCJC references
        """
        if not self.is_available:
            return self._mock_equity_response()

        prompt = f"""You are an equity-minded education analyst reviewing program review content for a community college, a Hispanic-Serving Institution.

Analyze the following content for:
1. Mentions of student equity and disproportionate impact
2. Alignment with ACCJC Standard I.B.6 (disaggregated data analysis)
3. Connection to CCC's ISMP Goal 3 (Student Success and Equity)
4. Areas where equity considerations may be missing

Content to analyze:
{json.dumps(section_content, indent=2)}

{f"Program data: {json.dumps(program_data, indent=2)}" if program_data else ""}

Respond in JSON format:
{{
    "gaps_detected": [
        {{"demographic": "group name", "metric": "metric name", "gap_percentage": number, "description": "explanation"}}
    ],
    "suggestions": ["suggestion 1", "suggestion 2"],
    "ismp_alignments": [
        {{"goal": "3", "objective": "3.3", "title": "objective title"}}
    ],
    "accjc_references": ["Standard I.B.6 reference"]
}}"""

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    max_output_tokens=1024,
                ),
            )
            return self._parse_json_response(response.text, self._mock_equity_response())
        except Exception as e:
            print(f"Gemini equity check error: {e}")
            return self._mock_equity_response()

    async def chat(
        self,
        message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Compliance Copilot (Mission-Bot) RAG chat.

        Uses Gemini File Search for RAG when file_search_store is configured,
        otherwise falls back to prompt-based knowledge.

        Args:
            message: User's question
            conversation_history: Previous messages in conversation

        Returns:
            Dictionary with response and citations
        """
        if not self.is_available:
            return self._mock_chat_response(message)

        # Build context from conversation history
        history_context = ""
        if conversation_history:
            for msg in conversation_history[-5:]:  # Last 5 messages
                role = msg.get("role", "user")
                content = msg.get("content", "")
                history_context += f"{role.upper()}: {content}\n"

        prompt = f"""You are Mission-Bot, a helpful AI assistant for community college faculty and staff.

You have access to indexed institutional documents including:
- ACCJC Accreditation Standards (2024)
- Integrated Strategic Master Plan (ISMP)
- Various ACCJC policy documents

Key institutional context:
- CCC has 5 ISMP Strategic Goals: Expand Access, Student-Centered Institution, Student Success and Equity, Organizational Effectiveness, Financial Stability
- Course completion target: 67%
- Hispanic student population: 77.5% (HSI designation)
- Core Values: LICE²S (Learning, Integrity, Collaboration, Excellence, Equity, Student Success)

{f"Previous conversation:{chr(10)}{history_context}" if history_context else ""}

User question: {message}

Instructions:
- Search the indexed documents to find relevant information
- Provide accurate, evidence-based responses
- Cite specific sources (document name, page/section) when referencing indexed content
- Format your response clearly with markdown
- If the question is outside the scope of available documents, say so

Response:"""

        try:
            # Build generation config with File Search tool if store is configured
            config_params = {
                "temperature": 0.3,
                "max_output_tokens": 1500,
            }

            # Use File Search RAG if store is configured
            if self.file_search_store:
                config_params["tools"] = [
                    types.Tool(
                        file_search=types.FileSearch(
                            file_search_store_names=[self.file_search_store]
                        )
                    )
                ]

            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(**config_params),
            )

            # Extract citations from response
            citations = self._extract_citations(response.text)

            # Also extract grounding metadata citations if available
            if hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]
                if hasattr(candidate, 'grounding_metadata') and candidate.grounding_metadata:
                    grounding = candidate.grounding_metadata
                    # Add grounding citations if present
                    if hasattr(grounding, 'grounding_chunks'):
                        for chunk in grounding.grounding_chunks:
                            if hasattr(chunk, 'web') and chunk.web:
                                citations.append({
                                    "source": chunk.web.title or "Document",
                                    "uri": chunk.web.uri or "",
                                })
                            elif hasattr(chunk, 'retrieved_context'):
                                citations.append({
                                    "source": chunk.retrieved_context.title or "Retrieved Document",
                                    "text": chunk.retrieved_context.text[:200] if chunk.retrieved_context.text else "",
                                })

            return {
                "response": response.text.strip(),
                "citations": citations,
                "rag_enabled": bool(self.file_search_store),
            }
        except Exception as e:
            print(f"Gemini chat error: {e}")
            return self._mock_chat_response(message)

    async def chat_stream(
        self,
        message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> AsyncIterator[str]:
        """
        Streaming version of Compliance Copilot chat.

        Yields text chunks as they are generated for real-time display.

        Args:
            message: User's question
            conversation_history: Previous messages in conversation

        Yields:
            Text chunks as they are generated
        """
        if not self.is_available:
            # For mock responses, simulate streaming by yielding word by word
            mock_response = self._mock_chat_response(message)
            words = mock_response["response"].split()
            for i, word in enumerate(words):
                yield word + (" " if i < len(words) - 1 else "")
                await asyncio.sleep(0.02)  # Small delay to simulate streaming
            return

        # Build context from conversation history
        history_context = ""
        if conversation_history:
            for msg in conversation_history[-5:]:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                history_context += f"{role.upper()}: {content}\n"

        prompt = f"""You are Mission-Bot, a helpful AI assistant for community college faculty and staff.

You have access to indexed institutional documents including:
- ACCJC Accreditation Standards (2024)
- Integrated Strategic Master Plan (ISMP)
- Various ACCJC policy documents

Key institutional context:
- CCC has 5 ISMP Strategic Goals
- Course completion target: 67%
- Hispanic student population: 77.5% (HSI designation)

{f"Previous conversation:{chr(10)}{history_context}" if history_context else ""}

User question: {message}

Provide a helpful, accurate response with markdown formatting."""

        try:
            # Build generation config
            config_params = {
                "temperature": 0.3,
                "max_output_tokens": 1500,
            }

            # Use File Search RAG if store is configured
            if self.file_search_store:
                config_params["tools"] = [
                    types.Tool(
                        file_search=types.FileSearch(
                            file_search_store_names=[self.file_search_store]
                        )
                    )
                ]

            # Use streaming generation
            response_stream = self.client.models.generate_content_stream(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(**config_params),
            )

            # Yield text chunks as they arrive
            for chunk in response_stream:
                if chunk.text:
                    yield chunk.text

        except Exception as e:
            print(f"Gemini streaming error: {e}")
            # Fallback to mock streaming
            mock_response = self._mock_chat_response(message)
            yield mock_response["response"]

    async def socratic_guidance(
        self,
        section_key: str,
        current_content: Optional[str] = None,
        data_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Socratic questioning mode for guided reflection.

        Args:
            section_key: Which section of the review
            current_content: What the user has written so far
            data_context: Relevant data for the section

        Returns:
            Dictionary with guiding question and follow-up prompts
        """
        if not self.is_available:
            return self._mock_socratic_response(section_key)

        prompt = f"""You are a supportive faculty mentor helping a colleague complete their program review at a community college.

Section being worked on: {section_key}
Current content: {current_content or 'Not started yet'}
{f"Relevant data: {json.dumps(data_context)}" if data_context else ""}

Use the Socratic method to guide reflection. Ask ONE thoughtful, open-ended question that will help them:
1. Think more deeply about their program
2. Connect observations to data
3. Consider equity implications
4. Link to institutional goals

Also provide 2-3 follow-up prompts they could consider.

Respond in JSON format:
{{
    "question": "Your main guiding question",
    "follow_up_prompts": ["prompt 1", "prompt 2", "prompt 3"],
    "suggested_data_exploration": "Optional suggestion for data to explore"
}}"""

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    max_output_tokens=512,
                ),
            )
            return self._parse_json_response(response.text, self._mock_socratic_response(section_key))
        except Exception as e:
            print(f"Gemini socratic error: {e}")
            return self._mock_socratic_response(section_key)

    # ============ Helper Methods ============

    def _build_analyze_prompt(
        self,
        data: Dict[str, Any],
        context: Optional[str],
        focus_areas: Optional[List[str]],
    ) -> str:
        """Build prompt for data analysis."""
        focus_str = ", ".join(focus_areas) if focus_areas else "overall trends"

        return f"""You are an institutional researcher analyzing data for a community college program review.

Context: {context or 'General program analysis'}
Focus areas: {focus_str}

Analyze the following data and identify:
1. Key insights (3-5 bullet points)
2. Notable trends with direction and magnitude
3. Actionable recommendations

Data:
{json.dumps(data, indent=2)}

Respond in JSON format:
{{
    "insights": ["insight 1", "insight 2", "insight 3"],
    "trends": [
        {{"metric": "name", "direction": "up/down/stable", "percentage": number}}
    ],
    "recommendations": ["recommendation 1", "recommendation 2"]
}}"""

    def _parse_analyze_response(self, text: str) -> Dict[str, Any]:
        """Parse Gemini response for analysis."""
        return self._parse_json_response(text, self._mock_analyze_response())

    def _parse_json_response(self, text: str, fallback: Dict[str, Any]) -> Dict[str, Any]:
        """Parse JSON from Gemini response."""
        try:
            # Try to find JSON in the response
            text = text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]

            return json.loads(text.strip())
        except (json.JSONDecodeError, ValueError):
            return fallback

    def _extract_citations(self, text: str) -> List[Dict[str, Any]]:
        """Extract citation references from response text."""
        citations = []

        # Simple keyword-based citation extraction
        citation_keywords = [
            ("ACCJC", "ACCJC Accreditation Standards"),
            ("Standard I", "ACCJC Standard I"),
            ("Standard II", "ACCJC Standard II"),
            ("Standard III", "ACCJC Standard III"),
            ("Standard IV", "ACCJC Standard IV"),
            ("ISMP", "CCC ISMP 2019-2024"),
            ("Goal 1", "ISMP Goal 1: Expand Access"),
            ("Goal 2", "ISMP Goal 2: Student-Centered"),
            ("Goal 3", "ISMP Goal 3: Student Success and Equity"),
            ("Goal 4", "ISMP Goal 4: Organizational Effectiveness"),
            ("Goal 5", "ISMP Goal 5: Financial Stability"),
        ]

        for keyword, source in citation_keywords:
            if keyword.lower() in text.lower():
                if not any(c["source"] == source for c in citations):
                    citations.append({"source": source, "text": keyword})

        return citations

    # ============ Mock Responses ============

    def _mock_analyze_response(self) -> Dict[str, Any]:
        """Return mock analysis response."""
        return {
            "insights": [
                "Enrollment shows a 5.2% increase year-over-year",
                "Online course sections have grown by 15%",
                "Evening enrollment has declined by 8%",
                "Fill rate has improved to 78%",
            ],
            "trends": [
                {"metric": "enrollment", "direction": "up", "percentage": 5.2},
                {"metric": "online_sections", "direction": "up", "percentage": 15},
                {"metric": "evening_enrollment", "direction": "down", "percentage": -8},
            ],
            "recommendations": [
                "Consider expanding hybrid course offerings to capture both modalities",
                "Investigate causes of evening enrollment decline through student surveys",
                "Review online course success rates to ensure quality",
            ],
        }

    def _mock_expand_response(self, bullets: List[str]) -> Dict[str, Any]:
        """Return mock narrative expansion."""
        combined = " ".join(bullets)
        narrative = f"""The program has demonstrated notable progress in several key areas during the review period. {combined}

These findings align with CCC's commitment to student success and reflect the department's ongoing efforts to improve educational outcomes. The data suggests areas of strength that can be built upon, while also highlighting opportunities for targeted improvement.

Moving forward, the department will continue to monitor these metrics and implement evidence-based strategies to support student achievement, particularly for disproportionately impacted student populations per ISMP Goal 3.3."""

        return {
            "narrative": narrative,
            "word_count": len(narrative.split()),
        }

    def _mock_equity_response(self) -> Dict[str, Any]:
        """Return mock equity check response."""
        return {
            "gaps_detected": [
                {
                    "demographic": "African American Students",
                    "metric": "course_completion",
                    "gap_percentage": 7.0,
                    "description": "7.0 percentage point gap below institution average in completion rates",
                },
                {
                    "demographic": "Pell Grant Recipients",
                    "metric": "success_rate",
                    "gap_percentage": 3.6,
                    "description": "3.6 percentage point gap in success rates compared to non-recipients",
                },
            ],
            "suggestions": [
                "Add an action plan specifically addressing the African American student achievement gap",
                "Consider linking to ISMP Goal 3.3 (Reduce equity gaps for disproportionately impacted students)",
                "Include specific intervention strategies such as supplemental instruction or peer mentoring",
                "Reference baseline metrics and set measurable improvement targets",
            ],
            "ismp_alignments": [
                {
                    "goal": "3",
                    "objective": "3.3",
                    "title": "Reduce equity gaps for disproportionately impacted students",
                },
                {
                    "goal": "3",
                    "objective": "3.1",
                    "title": "Increase course success and retention rates",
                },
            ],
            "accjc_references": [
                "Standard I.B.6: The institution disaggregates and analyzes learning outcomes and achievement for subpopulations of students",
                "Standard II.A.7: The institution effectively uses delivery modes, teaching methodologies and learning support services",
            ],
        }

    def _mock_chat_response(self, message: str) -> Dict[str, Any]:
        """Return mock chat response based on keywords."""
        message_lower = message.lower()

        if "equity" in message_lower or "gap" in message_lower:
            response = """**Equity in Program Review**

ACCJC Standard I.B.6 requires colleges to disaggregate student achievement data by demographic groups and address any identified achievement gaps.

**ISMP Goal 3.3** specifically focuses on reducing equity gaps for disproportionately impacted students.

In your program review, you should:
1. Analyze success rates by demographic group
2. Identify gaps greater than 3 percentage points
3. Propose action plans targeting these gaps
4. Link your plans to ISMP Goal 3.3

The Percentage Point Gap (PPG) methodology is commonly used to identify disproportionate impact."""
            citations = [
                {"source": "ACCJC Standards 2024", "page": 23, "text": "Standard I.B.6"},
                {"source": "CCC ISMP 2019-2024", "page": 45, "text": "Goal 3.3"},
            ]
        elif "ismp" in message_lower or "strategic" in message_lower or "goal" in message_lower:
            response = """**CCC ISMP Strategic Goals (2019-2024)**

1. **Goal 1: Expand Access** - Expand access to educational programs and services
2. **Goal 2: Student-Centered Institution** - Support students achieving their educational and career goals
3. **Goal 3: Student Success and Equity** - Increase student success and reduce equity gaps
4. **Goal 4: Organizational Effectiveness** - Enhance organizational effectiveness
5. **Goal 5: Financial Stability** - Improve financial stability

Each goal has specific objectives. For example, Goal 3.3 focuses on reducing equity gaps for disproportionately impacted students.

The "Golden Thread" framework connects: College Mission → ISMP Goal → Program Goal → Action Plan → Resource Request"""
            citations = [
                {"source": "CCC ISMP 2019-2024", "page": 12, "text": "Strategic Goals Overview"},
            ]
        else:
            response = f"""I can help you with questions about:
- **ACCJC Accreditation Standards**
- **ISMP Strategic Goals** (1-5)
- **Program Review best practices**
- **Equity analysis and disproportionate impact**
- **The Golden Thread framework**

Could you please be more specific about what aspect you'd like to explore?"""
            citations = []

        return {
            "response": response,
            "citations": citations,
            "rag_enabled": False,
        }

    def _mock_socratic_response(self, section_key: str) -> Dict[str, Any]:
        """Return mock Socratic response."""
        section_questions = {
            "student_success": {
                "question": "What patterns do you notice when comparing your program's success rates to the institution-wide averages?",
                "follow_up_prompts": [
                    "Are there specific course modalities where students perform better or worse?",
                    "How do success rates vary across different student demographics?",
                    "What changes have you implemented in the past year that might affect these outcomes?",
                ],
                "suggested_data_exploration": "Would you like to view disaggregated success data by ethnicity and Pell status?",
            },
            "equity_analysis": {
                "question": "Which student populations in your program show the largest achievement gaps compared to the overall average?",
                "follow_up_prompts": [
                    "What support services are currently available to these students?",
                    "Have you consulted with student services about intervention strategies?",
                    "How does your program's gap compare to the college-wide pattern?",
                ],
                "suggested_data_exploration": "Would you like to calculate the Percentage Point Gap (PPG) for each demographic group?",
            },
            "curriculum": {
                "question": "How current is your curriculum in meeting industry standards and transfer requirements?",
                "follow_up_prompts": [
                    "When were your core courses last updated?",
                    "What feedback have you received from advisory boards or transfer institutions?",
                    "Are there emerging trends in your field that should be reflected in the curriculum?",
                ],
                "suggested_data_exploration": "Would you like to see a timeline of course approvals and modifications?",
            },
        }

        return section_questions.get(section_key, {
            "question": "What would you like to highlight as the most significant accomplishment or challenge for your program this year?",
            "follow_up_prompts": [
                "How does this connect to your previous goals?",
                "What data supports this observation?",
                "How does this align with CCC's strategic priorities?",
            ],
            "suggested_data_exploration": None,
        })


# Singleton instance
gemini_service = GeminiService()
