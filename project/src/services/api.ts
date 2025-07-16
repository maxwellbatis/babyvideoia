import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface GenerateVideoRequest {
  tema: string;
  tipo: string;
  publico: string;
  cenas: number;
  formato: string;
  voz_elevenlabs?: string;
  musica?: string;
  imagensApp?: string[];
  tom?: string;
  useStableDiffusion?: boolean;
  titulo?: string; // Novo campo para título do vídeo
  gerarLegenda?: boolean; // Novo campo para gerar legenda de redes sociais
  plataformaLegenda?: 'instagram' | 'facebook' | 'tiktok' | 'youtube'; // Novo campo para escolher plataforma
  configuracoes?: {
    duracao?: number;
    qualidade?: string;
    estilo?: string;
  };
}

export interface Video {
  id: string;
  titulo: string;
  thumbnail: string;
  url: string;
  hashtags: string[];
  created_at: string;
  status: 'processing' | 'completed' | 'failed';
  legendaRedesSociais?: string; // Novo campo
  configuracoes: GenerateVideoRequest;
}

export interface ApiStatus {
  gemini: boolean;
  groq: boolean;
  elevenlabs: boolean;
  runway?: boolean;
  freepik: boolean;
  status: 'online' | 'offline' | 'partial';
  cloudinary?: boolean;
  limits?: {
    gemini?: string;
    groq?: string;
    elevenlabs?: string;
    freepik?: string;
    cloudinary?: string;
  };
  usage?: {
    gemini?: number | null;
    groq?: number | null;
    elevenlabs?: number | null;
    freepik?: number | null;
    cloudinary?: number | null;
  };
  errors?: {
    gemini?: string | null;
    groq?: string | null;
    elevenlabs?: string | null;
    freepik?: string | null;
    cloudinary?: string | null;
  };
}

export interface ChatMessage {
  id: string;
  message: string;
  type: 'user' | 'assistant';
  timestamp: string;
  suggestions?: string[];
}

export interface AppImage {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploaded_at: string;
}

export interface Music {
  id: string;
  name: string;
  url: string;
  duration: number;
  size: number;
  uploaded_at: string;
}

// Video generation
export const generateVideo = async (data: GenerateVideoRequest): Promise<Video> => {
  const response = await api.post('/generate-video', data);
  return response.data;
};

// Get videos
export const getVideos = async (): Promise<Video[]> => {
  const response = await api.get('/videos');
  return response.data;
};

// Get video by ID
export const getVideo = async (id: string): Promise<Video> => {
  const response = await api.get(`/videos/${id}`);
  return response.data;
};

// Delete video
export const deleteVideo = async (id: string): Promise<void> => {
  await api.delete(`/videos/${id}`);
};

// API Status
export const getApiStatus = async (): Promise<ApiStatus> => {
  const response = await api.get('/status/apis');
  return response.data;
};

// Chat
export const sendChatMessage = async (message: string): Promise<ChatMessage> => {
  const response = await api.post('/chat', { message });
  return response.data;
};

// Upload music
export const uploadMusic = async (file: File): Promise<Music> => {
  const formData = new FormData();
  formData.append('music', file);
  
  const response = await api.post('/upload-music', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Get music files
export const getMusic = async (): Promise<Music[]> => {
  const response = await api.get('/music');
  return response.data;
};

// Delete music
export const deleteMusic = async (id: string): Promise<void> => {
  await api.delete(`/music/${id}`);
};

// Upload app image
export const uploadAppImage = async (file: File): Promise<AppImage> => {
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await api.post('/upload-app-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Get app images
export const getAppImages = async (): Promise<AppImage[]> => {
  const response = await api.get('/app-images');
  return response.data;
};

// Delete app image
export const deleteAppImage = async (id: string): Promise<void> => {
  await api.delete(`/app-images/${id}`);
};

export default api;