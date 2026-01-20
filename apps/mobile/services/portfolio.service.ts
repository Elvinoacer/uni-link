import { apiClient } from './api';

export interface Portfolio {
  id: string;
  userId: string;
  headline?: string;
  bio?: string;
  roleTitle?: string;
  location?: string;
  timezone?: string;
  yearsOfExperience?: number;
  resumeUrl?: string;
  portfolioUrl?: string;
  availabilityStatus: 'available' | 'busy' | 'open_to_work';
  skills: string[];
  projects: PortfolioProject[];
  experiences: PortfolioExperience[];
  education: PortfolioEducation[];
  certifications: PortfolioCertification[];
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioProject {
  id: string;
  portfolioId: string;
  title: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  createdAt: string;
}

export interface PortfolioExperience {
  id: string;
  portfolioId: string;
  company: string;
  title: string;
  startDate: string;
  endDate?: string;
  description?: string;
  createdAt: string;
}

export interface PortfolioEducation {
  id: string;
  portfolioId: string;
  institution: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export interface PortfolioCertification {
  id: string;
  portfolioId: string;
  name: string;
  issuer?: string;
  issueDate?: string;
  url?: string;
  createdAt: string;
}

export interface PortfolioUpdateData {
  headline?: string;
  bio?: string;
  roleTitle?: string;
  location?: string;
  timezone?: string;
  yearsOfExperience?: number;
  resumeUrl?: string;
  portfolioUrl?: string;
  availabilityStatus?: 'available' | 'busy' | 'open_to_work';
  skills?: string[];
}

export const PortfolioService = {
  // Get own portfolio
  getMyPortfolio: async (): Promise<Portfolio | null> => {
    const response = await apiClient.get('/portfolio/me');
    return response.data?.data || null;
  },

  // Get portfolio by user ID (public)
  getPortfolioByUserId: async (userId: string): Promise<Portfolio | null> => {
    const response = await apiClient.get(`/portfolio/${userId}`);
    return response.data?.data || null;
  },

  // Create/Update portfolio
  updatePortfolio: async (data: PortfolioUpdateData): Promise<Portfolio> => {
    const response = await apiClient.put('/portfolio', data);
    return response.data?.data;
  },

  // Projects
  addProject: async (data: Omit<PortfolioProject, 'id' | 'portfolioId' | 'createdAt'>): Promise<PortfolioProject> => {
    const response = await apiClient.post('/portfolio/projects', data);
    return response.data?.data;
  },

  updateProject: async (id: string, data: Partial<PortfolioProject>): Promise<PortfolioProject> => {
    const response = await apiClient.patch(`/portfolio/projects/${id}`, data);
    return response.data?.data;
  },

  deleteProject: async (id: string): Promise<void> => {
    await apiClient.delete(`/portfolio/projects/${id}`);
  },

  // Experiences
  addExperience: async (data: Omit<PortfolioExperience, 'id' | 'portfolioId' | 'createdAt'>): Promise<PortfolioExperience> => {
    const response = await apiClient.post('/portfolio/experiences', data);
    return response.data?.data;
  },

  updateExperience: async (id: string, data: Partial<PortfolioExperience>): Promise<PortfolioExperience> => {
    const response = await apiClient.patch(`/portfolio/experiences/${id}`, data);
    return response.data?.data;
  },

  deleteExperience: async (id: string): Promise<void> => {
    await apiClient.delete(`/portfolio/experiences/${id}`);
  },

  // Education
  addEducation: async (data: Omit<PortfolioEducation, 'id' | 'portfolioId' | 'createdAt'>): Promise<PortfolioEducation> => {
    const response = await apiClient.post('/portfolio/education', data);
    return response.data?.data;
  },

  updateEducation: async (id: string, data: Partial<PortfolioEducation>): Promise<PortfolioEducation> => {
    const response = await apiClient.patch(`/portfolio/education/${id}`, data);
    return response.data?.data;
  },

  deleteEducation: async (id: string): Promise<void> => {
    await apiClient.delete(`/portfolio/education/${id}`);
  },

  // Certifications
  addCertification: async (data: Omit<PortfolioCertification, 'id' | 'portfolioId' | 'createdAt'>): Promise<PortfolioCertification> => {
    const response = await apiClient.post('/portfolio/certifications', data);
    return response.data?.data;
  },

  updateCertification: async (id: string, data: Partial<PortfolioCertification>): Promise<PortfolioCertification> => {
    const response = await apiClient.patch(`/portfolio/certifications/${id}`, data);
    return response.data?.data;
  },

  deleteCertification: async (id: string): Promise<void> => {
    await apiClient.delete(`/portfolio/certifications/${id}`);
  },
};
