/**
 * Export an analysis result to a styled PDF using jsPDF.
 * Falls back to window.print() if jsPDF fails to load.
 */
export async function exportAnalysisPdf(analysis: {
  id: string;
  domain: string;
  score: number | null;
  breakdown: Record<string, number> | null;
  keywordsMatched: string[];
  keywordsMissed: string[];
  suggestions: string[];
  warnings: string[];
  resume: { originalName: string };
  createdAt: string;
}) {
  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const W   = doc.internal.pageSize.getWidth();
    const MAR = 15;
    let y = MAR;

    const nextLine = (gap = 6) => { y += gap; if (y > 270) { doc.addPage(); y = MAR; } };
    const section  = (title: string) => {
      nextLine(8);
      doc.setFillColor(99, 102, 241);
      doc.rect(MAR, y - 1, W - MAR * 2, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(title.toUpperCase(), MAR + 2, y + 4);
      nextLine(9);
      doc.setTextColor(30, 30, 40);
    };

    // ── Header ────────────────────────────────────────────────────────────────
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, W, 30, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('ATS Analysis Report', MAR, 13);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${analysis.resume.originalName} · ${analysis.domain} · ${new Date(analysis.createdAt).toLocaleDateString()}`, MAR, 21);
    y = 38;

    // ── ATS Score ─────────────────────────────────────────────────────────────
    const score = analysis.score ?? 0;
    const scoreColor: [number, number, number] = score >= 70 ? [16, 185, 129] : score >= 50 ? [245, 158, 11] : [239, 68, 68];
    doc.setFillColor(...scoreColor);
    doc.circle(MAR + 12, y + 8, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(String(score), MAR + 8, y + 12);
    doc.setTextColor(30, 30, 40);
    doc.setFontSize(10);
    doc.text('/100', MAR + 21, y + 12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 120);
    doc.text('ATS Score — ' + (score >= 70 ? 'Excellent ✓' : score >= 50 ? 'Good — needs improvement' : 'Needs significant work'), MAR + 30, y + 8);
    nextLine(28);

    // ── Breakdown ─────────────────────────────────────────────────────────────
    if (analysis.breakdown) {
      section('Score Breakdown');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const BAR_W = (W - MAR * 2 - 50) * 0.6;
      Object.entries(analysis.breakdown).forEach(([k, v]) => {
        const label = k.replace(/([A-Z])/g, ' $1').replace('Score', '').trim();
        doc.setTextColor(60, 60, 80);
        doc.text(`${label}:`, MAR, y);
        doc.text(`${v}%`, MAR + 45, y);
        // Bar background
        doc.setFillColor(220, 220, 235);
        doc.rect(MAR + 52, y - 3.5, BAR_W, 5, 'F');
        // Bar fill
        const fc: [number, number, number] = v >= 70 ? [16, 185, 129] : v >= 50 ? [245, 158, 11] : [239, 68, 68];
        doc.setFillColor(...fc);
        doc.rect(MAR + 52, y - 3.5, BAR_W * (v / 100), 5, 'F');
        nextLine(8);
      });
    }

    // ── Matched Keywords ──────────────────────────────────────────────────────
    if (analysis.keywordsMatched.length) {
      section(`✓ Matched Keywords (${analysis.keywordsMatched.length})`);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 80);
      const chunks: string[][] = [];
      let row: string[] = [];
      analysis.keywordsMatched.forEach(k => {
        row.push(k);
        if (row.length === 5) { chunks.push(row); row = []; }
      });
      if (row.length) chunks.push(row);
      chunks.forEach(r => {
        doc.text(r.join('   •   '), MAR, y);
        nextLine(6);
      });
    }

    // ── Missing Keywords ──────────────────────────────────────────────────────
    if (analysis.keywordsMissed.length) {
      section(`✗ Missing Keywords (${analysis.keywordsMissed.length})`);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(220, 50, 50);
      const chunks: string[][] = [];
      let row: string[] = [];
      analysis.keywordsMissed.forEach(k => {
        row.push(k);
        if (row.length === 5) { chunks.push(row); row = []; }
      });
      if (row.length) chunks.push(row);
      chunks.forEach(r => {
        doc.text(r.join('   •   '), MAR, y);
        nextLine(6);
      });
    }

    // ── Suggestions ───────────────────────────────────────────────────────────
    if (analysis.suggestions.length) {
      section(`Suggestions (${analysis.suggestions.length})`);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 80);
      analysis.suggestions.forEach((s, i) => {
        const lines = doc.splitTextToSize(`${i + 1}. ${s}`, W - MAR * 2);
        lines.forEach((line: string) => { doc.text(line, MAR, y); nextLine(5.5); });
      });
    }

    // ── Warnings ──────────────────────────────────────────────────────────────
    if (analysis.warnings.length) {
      section(`⚠ Warnings (${analysis.warnings.length})`);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(180, 100, 0);
      analysis.warnings.forEach((w, i) => {
        const lines = doc.splitTextToSize(`${i + 1}. ${w}`, W - MAR * 2);
        lines.forEach((line: string) => { doc.text(line, MAR, y); nextLine(5.5); });
      });
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalPages = (doc as any).internal.pages.length - 1;
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(7.5);
      doc.setTextColor(160, 160, 180);
      doc.text(`Generated by ATS Analyzer · Page ${p} of ${totalPages}`, MAR, 290);
    }

    doc.save(`ats-report-${analysis.id}.pdf`);
  } catch (err) {
    console.error('PDF export failed, falling back to print:', err);
    window.print();
  }
}
