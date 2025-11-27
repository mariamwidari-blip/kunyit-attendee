export interface QRCodeConfig {
  data: string;
  size?: number;
  colorDark?: string;
  colorLight?: string;
  logo?: string;
  logoMode?: "default" | "clean";
  bodyType?: "square" | "dot" | "rounded" | "extra-rounded" | "diamond";
  eyeFrameType?: "square" | "dot" | "rounded" | "extra-rounded";
  eyeBallType?: "square" | "dot" | "rounded" | "extra-rounded";
  gradientType?: "linear" | "radial";
  gradientOnEyes?: boolean;
}

export async function generateStyledQRCode(config: QRCodeConfig): Promise<string> {
  const {
    data,
    size = 300,
    colorDark = "#FFB800",
    colorLight = "#FFFFFF",
    bodyType = "rounded",
    eyeFrameType = "rounded",
    eyeBallType = "rounded",
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
      eyeBall1Color: colorDark,
      eyeBall2Color: colorDark,
      eyeBall3Color: colorDark,
      gradientColor1: "",
      gradientColor2: "",
      gradientType: "linear",
      gradientOnEyes: false,
      logo: "",
      logoMode: "default",
    },
    size: size,
    download: false,
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
      throw new Error("Failed to generate QR code");
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
}
