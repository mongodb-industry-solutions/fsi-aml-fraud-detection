"""
PDF Report Generation Service - Generate professional case investigation PDF reports
"""

import io
import logging
import re
from datetime import datetime
from typing import Dict, Any, Optional, List
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.platypus import KeepTogether, Image, ListFlowable, ListItem
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.lib.colors import HexColor

logger = logging.getLogger(__name__)


def _escape_xml(text: str) -> str:
    """Escape characters that have special meaning to reportlab's mini-XML parser."""
    return (
        text.replace('&', '&amp;')
            .replace('<', '&lt;')
            .replace('>', '&gt;')
    )


def _md_inline_to_rl(text: str) -> str:
    """Convert inline markdown (bold/italic/code) to reportlab's HTML-ish syntax."""
    text = _escape_xml(text)
    # Bold (**...**) -- handle before italic to avoid eating asterisks
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    # Italic (*...* or _..._) -- non-greedy, no leading/trailing space inside
    text = re.sub(r'(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)', r'<i>\1</i>', text)
    text = re.sub(r'_(?!\s)(.+?)(?<!\s)_', r'<i>\1</i>', text)
    # Inline code (`...`)
    text = re.sub(
        r'`([^`]+?)`',
        r'<font face="Courier" backColor="#f4f4f4">\1</font>',
        text,
    )
    return text


class PDFReportGenerator:
    """Generate professional PDF reports for case investigations"""
    
    def __init__(self):
        """Initialize PDF generator with styles"""
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
        
    def _setup_custom_styles(self):
        """Setup custom paragraph styles for the report"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Title'],
            fontSize=24,
            textColor=HexColor('#1a1a1a'),
            spaceAfter=30,
            alignment=TA_CENTER
        ))
        
        # Heading styles
        self.styles.add(ParagraphStyle(
            name='CustomHeading1',
            parent=self.styles['Heading1'],
            fontSize=18,
            textColor=HexColor('#2c3e50'),
            spaceAfter=12,
            spaceBefore=12,
            leftIndent=0
        ))
        
        self.styles.add(ParagraphStyle(
            name='CustomHeading2',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=HexColor('#34495e'),
            spaceAfter=8,
            spaceBefore=8,
            leftIndent=0
        ))
        
        # Body text
        self.styles.add(ParagraphStyle(
            name='CustomBody',
            parent=self.styles['BodyText'],
            fontSize=11,
            leading=14,
            textColor=HexColor('#2c3e50'),
            alignment=TA_JUSTIFY
        ))
        
        # Risk level styles
        self.styles.add(ParagraphStyle(
            name='HighRisk',
            parent=self.styles['BodyText'],
            fontSize=12,
            textColor=HexColor('#e74c3c'),
            fontName='Helvetica-Bold'
        ))
        
        self.styles.add(ParagraphStyle(
            name='MediumRisk',
            parent=self.styles['BodyText'],
            fontSize=12,
            textColor=HexColor('#f39c12'),
            fontName='Helvetica-Bold'
        ))
        
        self.styles.add(ParagraphStyle(
            name='LowRisk',
            parent=self.styles['BodyText'],
            fontSize=12,
            textColor=HexColor('#27ae60'),
            fontName='Helvetica-Bold'
        ))
        
    def generate_case_report(self, case_data: Dict[str, Any]) -> bytes:
        """
        Generate a PDF report from case investigation data
        
        Args:
            case_data: Complete case investigation data including workflow and classification
            
        Returns:
            PDF file as bytes
        """
        try:
            # Create PDF buffer
            buffer = io.BytesIO()
            
            # Create document
            doc = SimpleDocTemplate(
                buffer,
                pagesize=letter,
                rightMargin=72,
                leftMargin=72,
                topMargin=72,
                bottomMargin=72
            )
            
            # Build content
            story = []
            
            # Add header
            story.extend(self._create_header(case_data))
            
            # Add executive summary
            story.extend(self._create_executive_summary(case_data))
            
            # Add risk assessment section
            story.extend(self._create_risk_assessment(case_data))
            
            # Add entity information
            story.extend(self._create_entity_section(case_data))
            
            # Add search results summary
            story.extend(self._create_search_summary(case_data))
            
            # Add network analysis summary
            story.extend(self._create_network_summary(case_data))
            
            # Add AI classification details
            story.extend(self._create_ai_classification(case_data))
            
            # Add recommendations
            story.extend(self._create_recommendations(case_data))
            
            # Add investigation summary
            story.extend(self._create_investigation_summary(case_data))
            
            # Build PDF
            doc.build(story)
            
            # Get PDF bytes
            pdf_bytes = buffer.getvalue()
            buffer.close()
            
            logger.info(f"Generated PDF report: {len(pdf_bytes)} bytes")
            return pdf_bytes
            
        except Exception as e:
            logger.error(f"Failed to generate PDF report: {e}", exc_info=True)
            raise
    
    def _create_header(self, case_data: Dict[str, Any]) -> list:
        """Create report header"""
        elements = []
        
        # Title
        elements.append(Paragraph(
            "Case Investigation Report",
            self.styles['CustomTitle']
        ))
        
        # Case metadata table
        case_id = case_data.get('caseId', 'Unknown')
        created_at = case_data.get('createdAt', datetime.utcnow().isoformat())
        status = case_data.get('caseStatus', 'investigation_complete')
        
        metadata_data = [
            ['Case ID:', case_id],
            ['Report Date:', datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')],
            ['Status:', status.replace('_', ' ').title()],
            ['System:', 'ThreatSight 360 AML/KYC Platform']
        ]
        
        metadata_table = Table(metadata_data, colWidths=[2*inch, 4*inch])
        metadata_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        
        elements.append(metadata_table)
        elements.append(Spacer(1, 0.5*inch))
        
        return elements
    
    def _create_executive_summary(self, case_data: Dict[str, Any]) -> list:
        """Create executive summary section"""
        elements = []
        
        elements.append(Paragraph("Executive Summary", self.styles['CustomHeading1']))
        
        # Extract key data
        workflow_data = case_data.get('workflowData', {})
        entity_input = workflow_data.get('entityInput', {})
        classification = workflow_data.get('classification', {})
        investigation_summary = case_data.get('investigationSummary', '')
        
        entity_name = entity_input.get('fullName', 'Unknown Entity')
        entity_type = entity_input.get('entityType', 'Unknown')
        risk_level = classification.get('overall_risk_level', 'unknown')
        risk_score = classification.get('risk_score', 0)
        confidence_score = classification.get('confidence_score', 0)
        recommended_action = classification.get('recommended_action', 'review')
        
        # Create summary paragraph
        summary_text = f"""
        This report presents the comprehensive investigation findings for <b>{entity_name}</b>, 
        classified as {entity_type}. The AI-powered risk assessment has determined an overall risk 
        level of <b>{risk_level.upper()}</b> with a risk score of <b>{risk_score}/100</b> and 
        confidence level of <b>{confidence_score}%</b>.
        """
        
        elements.append(Paragraph(summary_text, self.styles['CustomBody']))
        elements.append(Spacer(1, 0.2*inch))
        
        # Add investigation summary if available
        if investigation_summary:
            elements.append(Paragraph("<b>Investigation Summary:</b>", self.styles['CustomHeading2']))
            elements.extend(self._markdown_to_flowables(investigation_summary))
            elements.append(Spacer(1, 0.3*inch))

        return elements
    
    def _create_risk_assessment(self, case_data: Dict[str, Any]) -> list:
        """Create risk assessment section"""
        elements = []
        
        elements.append(Paragraph("Risk Assessment", self.styles['CustomHeading1']))
        
        workflow_data = case_data.get('workflowData', {})
        classification = workflow_data.get('classification', {})
        
        # Risk metrics table
        risk_data = [
            ['Metric', 'Value', 'Status'],
            ['Overall Risk Level', classification.get('overall_risk_level', 'Unknown').upper(), 
             self._get_risk_indicator(classification.get('overall_risk_level', 'unknown'))],
            ['Risk Score', f"{classification.get('risk_score', 0)}/100", 
             self._get_score_indicator(classification.get('risk_score', 0))],
            ['Confidence Score', f"{classification.get('confidence_score', 0)}%",
             self._get_score_indicator(classification.get('confidence_score', 0))],
            ['Recommended Action', classification.get('recommended_action', 'review').replace('_', ' ').title(), ''],
        ]
        
        risk_table = Table(risk_data, colWidths=[2*inch, 2*inch, 2*inch])
        risk_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#3498db')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, HexColor('#ecf0f1')]),
        ]))
        
        elements.append(risk_table)
        elements.append(Spacer(1, 0.3*inch))
        
        # AML/KYC Flags
        aml_flags = classification.get('aml_kyc_flags', {})
        if aml_flags:
            elements.append(Paragraph("AML/KYC Compliance Flags", self.styles['CustomHeading2']))
            
            flag_data = []
            for flag_name, flag_value in aml_flags.items():
                if flag_name != 'additional_flags' and isinstance(flag_value, bool):
                    status = '✓' if flag_value else '✗'
                    color = HexColor('#e74c3c') if flag_value else HexColor('#27ae60')
                    flag_data.append([
                        flag_name.replace('_', ' ').title(),
                        status
                    ])
            
            if flag_data:
                flag_table = Table(flag_data, colWidths=[4*inch, 1*inch])
                flag_table.setStyle(TableStyle([
                    ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 0), (-1, -1), 10),
                    ('ALIGN', (1, 0), (1, -1), 'CENTER'),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ]))
                elements.append(flag_table)
                elements.append(Spacer(1, 0.2*inch))
        
        # Key Risk Factors
        risk_factors = classification.get('key_risk_factors', [])
        if risk_factors:
            elements.append(Paragraph("Key Risk Factors", self.styles['CustomHeading2']))
            for i, factor in enumerate(risk_factors[:5], 1):
                elements.append(Paragraph(f"{i}. {factor}", self.styles['CustomBody']))
            elements.append(Spacer(1, 0.3*inch))
        
        return elements
    
    def _create_entity_section(self, case_data: Dict[str, Any]) -> list:
        """Create entity information section"""
        elements = []
        
        elements.append(Paragraph("Entity Information", self.styles['CustomHeading1']))
        
        workflow_data = case_data.get('workflowData', {})
        entity_input = workflow_data.get('entityInput', {})
        
        entity_data = [
            ['Field', 'Value'],
            ['Full Name', entity_input.get('fullName', 'Not provided')],
            ['Entity Type', entity_input.get('entityType', 'Not provided')],
            ['Address', entity_input.get('address', 'Not provided')],
            ['Date Added', datetime.utcnow().strftime('%Y-%m-%d')],
        ]
        
        entity_table = Table(entity_data, colWidths=[2*inch, 4*inch])
        entity_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#34495e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, HexColor('#ecf0f1')]),
        ]))
        
        elements.append(entity_table)
        elements.append(Spacer(1, 0.3*inch))
        
        return elements
    
    def _create_search_summary(self, case_data: Dict[str, Any]) -> list:
        """Create search results summary"""
        elements = []
        
        workflow_data = case_data.get('workflowData', {})
        search_results = workflow_data.get('searchResults', {})
        
        if search_results:
            elements.append(Paragraph("Search Results Summary", self.styles['CustomHeading1']))
            
            atlas_count = len(search_results.get('atlasResults', []))
            vector_count = len(search_results.get('vectorResults', []))
            hybrid_count = len(search_results.get('hybridResults', []))
            
            search_text = f"""
            The entity resolution process identified <b>{hybrid_count}</b> potential matches using 
            MongoDB's hybrid search combining Atlas text search ({atlas_count} matches) and 
            vector similarity search ({vector_count} matches). The top matches have been analyzed 
            for relationship networks and transaction patterns.
            """
            
            elements.append(Paragraph(search_text, self.styles['CustomBody']))
            elements.append(Spacer(1, 0.3*inch))
        
        return elements
    
    def _create_network_summary(self, case_data: Dict[str, Any]) -> list:
        """Create network analysis summary"""
        elements = []
        
        workflow_data = case_data.get('workflowData', {})
        network_analysis = workflow_data.get('networkAnalysis', {})
        
        if network_analysis:
            elements.append(Paragraph("Network Analysis", self.styles['CustomHeading1']))
            
            entities_analyzed = network_analysis.get('entitiesAnalyzed', 0)
            analysis_type = network_analysis.get('analysisType', 'comprehensive')
            
            network_text = f"""
            Network analysis was performed on <b>{entities_analyzed}</b> entities using 
            {analysis_type} analysis. This included relationship network traversal at depth 2 
            and transaction network analysis at depth 1 to identify connected entities, 
            transaction patterns, and risk propagation through the network.
            """
            
            elements.append(Paragraph(network_text, self.styles['CustomBody']))
            elements.append(Spacer(1, 0.3*inch))
        
        return elements
    
    def _create_ai_classification(self, case_data: Dict[str, Any]) -> list:
        """Create AI classification details section"""
        elements = []
        
        workflow_data = case_data.get('workflowData', {})
        classification = workflow_data.get('classification', {})
        
        if classification:
            elements.append(Paragraph("AI Classification Analysis", self.styles['CustomHeading1']))
            
            detailed_analysis = classification.get('detailed_analysis', {})
            
            if detailed_analysis:
                # Entity Profile Assessment
                if detailed_analysis.get('entity_profile_assessment'):
                    elements.append(Paragraph("Entity Profile Assessment", self.styles['CustomHeading2']))
                    elements.append(Paragraph(
                        detailed_analysis['entity_profile_assessment'],
                        self.styles['CustomBody']
                    ))
                    elements.append(Spacer(1, 0.2*inch))
                
                # Network Positioning
                if detailed_analysis.get('network_positioning_analysis'):
                    elements.append(Paragraph("Network Positioning Analysis", self.styles['CustomHeading2']))
                    elements.append(Paragraph(
                        detailed_analysis['network_positioning_analysis'],
                        self.styles['CustomBody']
                    ))
                    elements.append(Spacer(1, 0.2*inch))
                
                # Data Quality
                if detailed_analysis.get('data_quality_assessment'):
                    elements.append(Paragraph("Data Quality Assessment", self.styles['CustomHeading2']))
                    elements.append(Paragraph(
                        detailed_analysis['data_quality_assessment'],
                        self.styles['CustomBody']
                    ))
                    elements.append(Spacer(1, 0.3*inch))
        
        return elements
    
    def _create_recommendations(self, case_data: Dict[str, Any]) -> list:
        """Create recommendations section"""
        elements = []
        
        workflow_data = case_data.get('workflowData', {})
        classification = workflow_data.get('classification', {})
        recommendations = classification.get('recommendations', [])
        
        if recommendations:
            elements.append(Paragraph("Recommendations", self.styles['CustomHeading1']))
            
            for i, recommendation in enumerate(recommendations, 1):
                elements.append(Paragraph(
                    f"<b>{i}.</b> {recommendation}",
                    self.styles['CustomBody']
                ))
            
            elements.append(Spacer(1, 0.3*inch))
        
        return elements
    
    def _create_investigation_summary(self, case_data: Dict[str, Any]) -> list:
        """Create investigation summary section"""
        elements = []
        
        investigation_summary = case_data.get('investigationSummary')
        
        if investigation_summary:
            elements.append(PageBreak())
            elements.append(Paragraph("Detailed Investigation Summary", self.styles['CustomHeading1']))
            elements.extend(self._markdown_to_flowables(investigation_summary))
        
        # Footer
        elements.append(Spacer(1, 0.5*inch))
        elements.append(Paragraph(
            f"Generated by ThreatSight 360 on {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
            ParagraphStyle(
                name='Footer',
                parent=self.styles['Normal'],
                fontSize=9,
                textColor=colors.grey,
                alignment=TA_CENTER
            )
        ))
        
        return elements
    
    def _markdown_to_flowables(self, text: str) -> list:
        """
        Convert a markdown string into a list of reportlab flowables.

        Handles: headers (#/##/###), bold/italic/inline-code, unordered (-, *)
        and ordered (1.) lists, blockquotes, and paragraph breaks. Everything
        else degrades gracefully to plain paragraphs.
        """
        if not text:
            return []

        elements: List = []
        # Normalize newlines and strip code fences if any
        text = text.replace('\r\n', '\n').replace('\r', '\n')
        text = re.sub(r'```[a-zA-Z]*\n?', '', text)

        lines = text.split('\n')
        list_buffer: List[ListItem] = []
        list_kind: Optional[str] = None  # 'ul' or 'ol'
        para_buffer: List[str] = []

        def flush_paragraph():
            if para_buffer:
                content = ' '.join(line.strip() for line in para_buffer if line.strip())
                if content:
                    elements.append(Paragraph(_md_inline_to_rl(content), self.styles['CustomBody']))
                    elements.append(Spacer(1, 0.08 * inch))
                para_buffer.clear()

        def flush_list():
            nonlocal list_buffer, list_kind
            if list_buffer:
                bullet_type = '1' if list_kind == 'ol' else 'bullet'
                elements.append(ListFlowable(
                    list_buffer,
                    bulletType=bullet_type,
                    leftIndent=18,
                    bulletFontSize=10,
                ))
                elements.append(Spacer(1, 0.08 * inch))
                list_buffer = []
                list_kind = None

        for raw in lines:
            line = raw.rstrip()

            if not line.strip():
                flush_paragraph()
                flush_list()
                continue

            # Headers
            header_match = re.match(r'^(#{1,6})\s+(.*)$', line)
            if header_match:
                flush_paragraph()
                flush_list()
                level = len(header_match.group(1))
                content = _md_inline_to_rl(header_match.group(2).strip())
                style_name = (
                    'CustomHeading1' if level == 1
                    else 'CustomHeading2' if level == 2
                    else 'CustomHeading2'
                )
                elements.append(Paragraph(content, self.styles[style_name]))
                continue

            # Unordered list item
            ul_match = re.match(r'^\s*[-*+]\s+(.*)$', line)
            if ul_match:
                flush_paragraph()
                if list_kind == 'ol':
                    flush_list()
                list_kind = 'ul'
                list_buffer.append(ListItem(
                    Paragraph(_md_inline_to_rl(ul_match.group(1).strip()), self.styles['CustomBody']),
                    leftIndent=18,
                ))
                continue

            # Ordered list item
            ol_match = re.match(r'^\s*\d+[.)]\s+(.*)$', line)
            if ol_match:
                flush_paragraph()
                if list_kind == 'ul':
                    flush_list()
                list_kind = 'ol'
                list_buffer.append(ListItem(
                    Paragraph(_md_inline_to_rl(ol_match.group(1).strip()), self.styles['CustomBody']),
                    leftIndent=18,
                ))
                continue

            # Blockquote -- render as indented paragraph
            quote_match = re.match(r'^\s*>\s?(.*)$', line)
            if quote_match:
                flush_paragraph()
                flush_list()
                elements.append(Paragraph(
                    _md_inline_to_rl(quote_match.group(1).strip()),
                    ParagraphStyle(
                        name='Quote',
                        parent=self.styles['CustomBody'],
                        leftIndent=18,
                        textColor=HexColor('#555555'),
                    ),
                ))
                continue

            # Plain paragraph line -- accumulate
            flush_list()
            para_buffer.append(line)

        flush_paragraph()
        flush_list()
        return elements

    def _get_risk_indicator(self, risk_level: str) -> str:
        """Get risk indicator symbol"""
        risk_level = risk_level.lower()
        if risk_level == 'high':
            return '⚠️ HIGH'
        elif risk_level == 'medium':
            return '⚡ MEDIUM'
        elif risk_level == 'low':
            return '✓ LOW'
        else:
            return '? UNKNOWN'
    
    def _get_score_indicator(self, score: float) -> str:
        """Get score indicator"""
        if score >= 80:
            return '🔴'
        elif score >= 60:
            return '🟡'
        elif score >= 40:
            return '🟢'
        else:
            return '⚪'


# Service instance
_pdf_generator = None


def get_pdf_generator() -> PDFReportGenerator:
    """Get or create PDF generator instance"""
    global _pdf_generator
    if _pdf_generator is None:
        _pdf_generator = PDFReportGenerator()
    return _pdf_generator