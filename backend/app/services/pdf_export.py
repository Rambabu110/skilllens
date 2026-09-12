"""
Advanced feature #5: downloadable Competency Passbook PDF -- a tangible,
official-report-style artifact a judge can open, not just a live UI.
"""
import io
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle


def build_passbook_pdf(learner, position, gaps: list[dict], recommendations: list[dict]) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle("Title2", parent=styles["Title"], textColor=colors.HexColor("#16233F"))
    heading_style = ParagraphStyle("Heading2b", parent=styles["Heading2"], textColor=colors.HexColor("#16233F"),
                                    spaceBefore=14, spaceAfter=6)
    normal = styles["Normal"]

    elements = [
        Paragraph("Competency Passbook", title_style),
        Paragraph("SkillLens AI &mdash; AI-Enabled Learning Platform for the Official Statistical System", normal),
        Spacer(1, 4 * mm),
        HRFlowable(width="100%", color=colors.HexColor("#DDD7C6")),
        Spacer(1, 6 * mm),
    ]

    meta_table = Table([
        ["Learner", learner.name],
        ["Position", position.title if position else "—"],
        ["Department", position.department if position else "—"],
        ["Generated on", datetime.utcnow().strftime("%d %B %Y")],
    ], colWidths=[40 * mm, 120 * mm])
    meta_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#4A5568")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 8 * mm))

    elements.append(Paragraph("Competency Gap Summary", heading_style))
    gap_rows = [["Competency", "Type", "Current", "Required", "Status"]]
    for g in gaps:
        gap_rows.append([
            g["competency_name"], g["competency_type"].title(),
            f"{g['current_level']:.1f}", str(g["required_level"]), g["status"].title(),
        ])
    gap_table = Table(gap_rows, colWidths=[55 * mm, 28 * mm, 22 * mm, 22 * mm, 28 * mm])
    gap_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#16233F")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#DDD7C6")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7F5EF")]),
    ]))
    elements.append(gap_table)
    elements.append(Spacer(1, 8 * mm))

    if recommendations:
        elements.append(Paragraph("Recommended Learning Modules", heading_style))
        rec_rows = [["Module", "Duration", "Level"]]
        for r in recommendations:
            m = r["module"]
            rec_rows.append([m.title, f"{m.duration_minutes} min", str(m.level)])
        rec_table = Table(rec_rows, colWidths=[100 * mm, 30 * mm, 25 * mm])
        rec_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#B8862E")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#DDD7C6")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7F5EF")]),
        ]))
        elements.append(rec_table)

    elements.append(Spacer(1, 10 * mm))
    elements.append(HRFlowable(width="100%", color=colors.HexColor("#DDD7C6")))
    elements.append(Spacer(1, 3 * mm))
    footer_style = ParagraphStyle("Footer", parent=normal, fontSize=8, textColor=colors.HexColor("#4A5568"))
    elements.append(Paragraph(
        "Competency gaps modeled against a FRAC-structured requirement tree (Framework of Roles, "
        "Activities and Competencies). Recommendations sourced from a mock iGOT Karmayogi catalog "
        "adapter, built for demonstration purposes.", footer_style,
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer.read()
