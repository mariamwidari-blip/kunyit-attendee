import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const requestBody = await req.json();
    
    console.log("Proxying request to QRCode Monkey API:", JSON.stringify(requestBody));

    const response = await fetch("https://api.qrcode-monkey.com/qr/custom", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log("QRCode Monkey API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("QRCode Monkey API error:", response.status, errorText);
      throw new Error(`QRCode Monkey API error: ${response.status} - ${errorText}`);
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    console.log("Successfully generated QR code, size:", arrayBuffer.byteLength);

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "image/png",
      },
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate QR code";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
