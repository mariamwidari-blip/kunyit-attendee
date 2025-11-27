export interface QRCodeConfig {
  data: string;
  size?: number;
  colorDark?: string;
  colorLight?: string;
  logo?: string;
  logoMode?: "default" | "clean";
  bodyType?: string;
  eyeFrameType?: string;
  eyeBallType?: string;
  gradientType?: "linear" | "radial";
  gradientOnEyes?: boolean;
}

export async function generateStyledQRCode(config: QRCodeConfig): Promise<string> {
  const {
    data,
    size = 1000,
    colorDark = "#1A1A1A",
    colorLight = "#FFF3DB",
    bodyType = "dot",
    eyeFrameType = "frame13",
    eyeBallType = "ball15",
    logo = "3b414c65127d1792c2650053e68d915c3c866130.jpg",
  } = config;

  const requestBody = {
    data: data,
    config: {
      body: bodyType,
      eye: eyeFrameType,
      eyeBall: eyeBallType,
      erf1: [],
      erf2: [],
      erf3: [],
      brf1: [],
      brf2: [],
      brf3: [],
      bodyColor: colorDark,
      bgColor: colorLight,
      eye1Color: colorDark,
      eye2Color: colorDark,
      eye3Color: colorDark,
      eyeBall1Color: "#ED9C23",
      eyeBall2Color: "#ED9C23",
      eyeBall3Color: "#ED9C23",
      gradientColor1: "",
      gradientColor2: "",
      gradientType: "linear",
      gradientOnEyes: false,
      logo: logo,
      logoMode: "default",
    },
    size: size,
    download: "false",
    file: "png",
  };

  try {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-qrcode`;
    const headers = {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("QR code generation failed:", errorText);
      throw new Error("Failed to generate QR code");
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
}
