export type ExportDocument = {
  title: string;
  deptLabel: string;
  leaderName: string;
  summary: string;
  body: string;
  userPrompt?: string;
  links?: Array<{ label: string; url: string }>;
};

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").slice(0, 80);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, "")
    .trim();
}

function buildPlainText(doc: ExportDocument): string {
  const lines = [
    doc.title,
    `${doc.deptLabel} · ${doc.leaderName}`,
    new Date().toLocaleString("ko-KR"),
    "",
  ];
  if (doc.userPrompt) {
    lines.push("[업무 지시]", doc.userPrompt, "");
  }
  if (doc.summary) {
    lines.push("[핵심 요약]", doc.summary, "");
  }
  lines.push("[본문]", stripMarkdown(doc.body));
  if (doc.links?.length) {
    lines.push("", "[참고 링크]");
    for (const link of doc.links) {
      lines.push(`- ${link.label}: ${link.url}`);
    }
  }
  return lines.join("\n");
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function exportChatTxt(doc: ExportDocument) {
  const blob = new Blob(["\uFEFF" + buildPlainText(doc)], {
    type: "text/plain;charset=utf-8",
  });
  downloadBlob(blob, `${sanitizeFilename(doc.title)}.txt`);
}

export async function exportChatPdf(doc: ExportDocument) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 18;
  const maxWidth = pdf.internal.pageSize.getWidth() - margin * 2;
  let y = margin;

  const writeLine = (text: string, size = 11, bold = false) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      if (y > pdf.internal.pageSize.getHeight() - margin) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(line, margin, y);
      y += size * 0.45;
    }
    y += 2;
  };

  writeLine(doc.title, 16, true);
  writeLine(`${doc.deptLabel} · ${doc.leaderName}`, 10);
  writeLine(new Date().toLocaleString("ko-KR"), 9);
  y += 4;

  if (doc.userPrompt) {
    writeLine("업무 지시", 12, true);
    writeLine(doc.userPrompt);
  }
  if (doc.summary) {
    writeLine("핵심 요약", 12, true);
    writeLine(doc.summary);
  }
  writeLine("본문", 12, true);
  writeLine(stripMarkdown(doc.body));

  if (doc.links?.length) {
    writeLine("참고 링크", 12, true);
    for (const link of doc.links) {
      writeLine(`${link.label}: ${link.url}`);
    }
  }

  pdf.save(`${sanitizeFilename(doc.title)}.pdf`);
}

export async function exportChatDocx(doc: ExportDocument) {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");

  const children: InstanceType<typeof Paragraph>[] = [
    new Paragraph({ text: doc.title, heading: HeadingLevel.HEADING_1 }),
    new Paragraph({
      children: [
        new TextRun({ text: `${doc.deptLabel} · ${doc.leaderName}`, italics: true }),
      ],
    }),
    new Paragraph({ text: new Date().toLocaleString("ko-KR") }),
    new Paragraph({ text: "" }),
  ];

  if (doc.userPrompt) {
    children.push(
      new Paragraph({ text: "업무 지시", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: doc.userPrompt }),
    );
  }
  if (doc.summary) {
    children.push(
      new Paragraph({ text: "핵심 요약", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: doc.summary }),
    );
  }

  children.push(new Paragraph({ text: "본문", heading: HeadingLevel.HEADING_2 }));
  for (const para of splitParagraphs(stripMarkdown(doc.body))) {
    children.push(new Paragraph({ text: para }));
  }

  if (doc.links?.length) {
    children.push(new Paragraph({ text: "참고 링크", heading: HeadingLevel.HEADING_2 }));
    for (const link of doc.links) {
      children.push(new Paragraph({ text: `${link.label}: ${link.url}` }));
    }
  }

  const file = await Packer.toBlob(new Document({ sections: [{ children }] }));
  downloadBlob(file, `${sanitizeFilename(doc.title)}.docx`);
}

export async function exportChatPptx(doc: ExportDocument) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.author = "WallPilot Pro";
  pptx.title = doc.title;

  const titleSlide = pptx.addSlide();
  titleSlide.addText(doc.title, {
    x: 0.6,
    y: 1.2,
    w: 8.8,
    h: 1.2,
    fontSize: 28,
    bold: true,
    color: "191F28",
  });
  titleSlide.addText(`${doc.deptLabel} · ${doc.leaderName}`, {
    x: 0.6,
    y: 2.5,
    w: 8.8,
    fontSize: 16,
    color: "3182F6",
  });
  titleSlide.addText(new Date().toLocaleString("ko-KR"), {
    x: 0.6,
    y: 3.2,
    w: 8.8,
    fontSize: 12,
    color: "8B95A1",
  });

  if (doc.summary) {
    const s = pptx.addSlide();
    s.addText("핵심 요약", { x: 0.6, y: 0.5, w: 8.8, fontSize: 22, bold: true });
    s.addText(doc.summary, { x: 0.6, y: 1.3, w: 8.8, h: 4.5, fontSize: 16, valign: "top" });
  }

  const chunks = splitParagraphs(stripMarkdown(doc.body));
  for (let i = 0; i < chunks.length; i += 2) {
    const slide = pptx.addSlide();
    slide.addText("본문", { x: 0.6, y: 0.5, w: 8.8, fontSize: 20, bold: true });
    const text = chunks.slice(i, i + 2).join("\n\n");
    slide.addText(text, { x: 0.6, y: 1.2, w: 8.8, h: 4.8, fontSize: 14, valign: "top" });
  }

  if (doc.links?.length) {
    const linkSlide = pptx.addSlide();
    linkSlide.addText("참고 링크", { x: 0.6, y: 0.5, w: 8.8, fontSize: 20, bold: true });
    linkSlide.addText(
      doc.links.map((l) => `${l.label}\n${l.url}`).join("\n\n"),
      { x: 0.6, y: 1.2, w: 8.8, h: 4.8, fontSize: 12, valign: "top" },
    );
  }

  const blob = await pptx.write({ outputType: "blob" });
  downloadBlob(blob as Blob, `${sanitizeFilename(doc.title)}.pptx`);
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** HWPX (한글 2014+) 호환 ZIP 패키지 */
export async function exportChatHwp(doc: ExportDocument) {
  const JSZip = (await import("jszip")).default;
  const plain = buildPlainText(doc);
  const paragraphs = plain.split("\n").map((line) =>
    line.trim()
      ? `<hp:p><hp:run><hp:t>${escapeXml(line)}</hp:t></hp:run></hp:p>`
      : `<hp:p><hp:run><hp:t></hp:t></hp:run></hp:p>`,
  );

  const sectionXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hs:sec xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section"
        xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph">
${paragraphs.join("\n")}
</hs:sec>`;

  const headerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hh:head xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head">
  <hh:beginNum page="1" footnote="1" endnote="1" pic="1" tbl="1" equation="1"/>
  <hh:refList>
    <hh:fontfaces itemCnt="1">
      <hh:fontface lang="HANGUL" fontCnt="1">
        <hh:font id="0" face="맑은 고딕" type="TTF" isEmbedded="0"/>
      </hh:fontface>
    </hh:fontfaces>
  </hh:refList>
</hh:head>`;

  const zip = new JSZip();
  zip.file("mimetype", "application/hwp+zip");
  zip.file(
    "version.xml",
    '<?xml version="1.0" encoding="UTF-8"?><hv:HCFVersion xmlns:hv="http://www.hancom.co.kr/hwpml/2011/version" tagetApplication="Word Processor" major="5" minor="1" micro="1" buildNumber="0"/>',
  );
  zip.file("Contents/header.xml", headerXml);
  zip.file("Contents/section0.xml", sectionXml);
  zip.file("Preview/PrvText.txt", plain.slice(0, 2000));

  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  downloadBlob(blob, `${sanitizeFilename(doc.title)}.hwpx`);
}

export type ExportFormat = "txt" | "pdf" | "docx" | "pptx" | "hwp";

export async function exportChatDocument(format: ExportFormat, doc: ExportDocument) {
  switch (format) {
    case "txt":
      exportChatTxt(doc);
      break;
    case "pdf":
      await exportChatPdf(doc);
      break;
    case "docx":
      await exportChatDocx(doc);
      break;
    case "pptx":
      await exportChatPptx(doc);
      break;
    case "hwp":
      await exportChatHwp(doc);
      break;
  }
}
