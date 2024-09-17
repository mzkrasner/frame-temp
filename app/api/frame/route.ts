import { NextRequest, NextResponse } from "next/server";

const generateSVG = (question: string, answers?: string[]) => {
  const encodedQuestion = question
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");

  // Function to wrap text
  const wrapText = (text: string, maxWidth: number, fontSize: number) => {
    const words = text.split(" ");
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = (currentLine.length + word.length) * (fontSize * 0.6); // Approximate width
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  const fontSize = 42;
  const maxWidth = 1100; // Slightly less than SVG width to add padding
  const wrappedQuestion = wrapText(encodedQuestion, maxWidth, fontSize);

  let wrappedAnswers: string[] = [];
  if (answers) {
    wrappedAnswers = answers.flatMap((answer, index) => {
      const encodedAnswer = answer
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/"/g, "&quot;");
      return wrapText(`${index + 1}. ${encodedAnswer}`, maxWidth, fontSize);
    });
  }

  const questionSvgLines = wrappedQuestion
    .map(
      (line, index) =>
        `<tspan x="50%" dy="${index === 0 ? "0" : "1.2em"}">${line}</tspan>`
    )
    .join("");

  const questionHeight = wrappedQuestion.length * fontSize * 1.2;
  const startY = 150; // Reduced from 300 to move everything up
  const separatorY = startY + questionHeight / 2 + 40; // 20px padding
  const svgWidth = 1200;

  const answersSvgLines = wrappedAnswers
    .map(
      (line, index) =>
        `<tspan x="8%" dy="${index === 0 ? "1.2em" : "1.2em"}">${line}</tspan>`
    )
    .join("");

  return `
    <svg width="${svgWidth}" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f0f0f0"/>
      <text x="50%" y="${startY}" font-weight="bold" font-family="Arial, sans-serif" font-size="${fontSize}" fill="#333" text-anchor="middle" dominant-baseline="middle">
        ${questionSvgLines}
      </text>
      <line x1="100" y1="${separatorY}" x2="1100" y2="${separatorY}" stroke="#333" stroke-width="2"/>
      <text y="${
        separatorY + 20
      }" font-family="Arial, sans-serif" font-size="${fontSize}" fill="#333">
        ${answersSvgLines}
      </text>
    </svg>
  `.trim();
};

async function getResponse(req: NextRequest): Promise<NextResponse> {
  const searchParams = req.nextUrl.searchParams;
  const idString: any = searchParams.get("id");
  const id = parseInt(idString);
  const nextId = id + 1;
  const data = await req.json();
  const buttonId = data.untrustedData.buttonIndex;

  // Set up the Hub client
  // const hub = await getSSLHubRpcClient("nemes.farcaster.xyz:2283");

  if (id > 1) {
    const prevResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/quiz?id=${id - 1}`,
      {
        method: "GET",
      }
    )
      .then((res) => res.json())
      .then((data) => {
        return { data: data.question.answers, score: data.score };
      });

    const body = {
      questionId: id - 1,
      answer: prevResponse.data[buttonId - 1],
      fid: data.untrustedData.fid,
    };

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/quiz`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
    }).then((res) => res.json());

    const addPoint = res.result ? 1 : 0;

    const currPoints = prevResponse.score + addPoint;

    console.log("Response from quiz API:", res.result, currPoints);

    if (id === 21) {
      const svgScore = generateSVG(
        `Congratulations! You got ${currPoints} out of 20 answers correct!`
      );
      const svgBase64End = Buffer.from(svgScore).toString("base64");
      return new NextResponse(`<!DOCTYPE html><html><head>
      <title>The End</title>
      <meta property="fc:frame" content="vNext" />
      <meta property="fc:frame:image" content="data:image/svg+xml;base64,${svgBase64End}" />
      <meta property="fc:frame:button:1" content="Play again" />
      <meta property="fc:frame:post_url" content="${process.env.NEXT_PUBLIC_BASE_URL}/api/frame?id=1" />
      <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
    </head></html>`);
    }
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/quiz?id=${id}`,
    {
      method: "GET",
    }
  ).then((res) => res.json());
  const answerOptions = response.question.answers;

  const svgQuestion = generateSVG(response.question.question, answerOptions);
  const svgBase64 = Buffer.from(svgQuestion).toString("base64");

  return new NextResponse(`<!DOCTYPE html><html><head>
    <title>This is frame ${id}</title>
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="data:image/svg+xml;base64,${svgBase64}" />
    <meta property="fc:frame:button:1" content="1" />
    <meta property="fc:frame:button:2" content="2" />
    <meta property="fc:frame:button:3" content="3" />
    <meta property="fc:frame:button:4" content="4" />
    <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
    <meta property="fc:frame:post_url" content="${process.env.NEXT_PUBLIC_BASE_URL}/api/frame?id=${nextId}" />
  </head></html>`);
}

export async function POST(req: NextRequest): Promise<Response> {
  return getResponse(req);
}

export const dynamic = "force-dynamic";
