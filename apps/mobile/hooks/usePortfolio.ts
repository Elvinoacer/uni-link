import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  PortfolioService, 
  Portfolio, 
  PortfolioUpdateData,
  PortfolioProject,
  PortfolioExperience,
  PortfolioEducation,
  PortfolioCertification,
} from '../services/portfolio.service';

// Get own portfolio
export function useMyPortfolio() {
  return useQuery({
    queryKey: ['portfolio', 'me'],
    queryFn: PortfolioService.getMyPortfolio,
  });
}

// Get portfolio by user ID (public)
export function usePortfolio(userId: string) {
  return useQuery({
    queryKey: ['portfolio', userId],
    queryFn: () => PortfolioService.getPortfolioByUserId(userId),
    enabled: !!userId,
  });
}

// Update portfolio
export function useUpdatePortfolio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PortfolioUpdateData) => PortfolioService.updatePortfolio(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}

// Projects
export function useAddProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<PortfolioProject, 'id' | 'portfolioId' | 'createdAt'>) => 
      PortfolioService.addProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PortfolioProject> }) => 
      PortfolioService.updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => PortfolioService.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}

// Experiences
export function useAddExperience() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<PortfolioExperience, 'id' | 'portfolioId' | 'createdAt'>) => 
      PortfolioService.addExperience(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}

export function useUpdateExperience() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PortfolioExperience> }) => 
      PortfolioService.updateExperience(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}

export function useDeleteExperience() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => PortfolioService.deleteExperience(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}

// Education
export function useAddEducation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<PortfolioEducation, 'id' | 'portfolioId' | 'createdAt'>) => 
      PortfolioService.addEducation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}

export function useUpdateEducation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PortfolioEducation> }) => 
      PortfolioService.updateEducation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}

export function useDeleteEducation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => PortfolioService.deleteEducation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}

// Certifications
export function useAddCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<PortfolioCertification, 'id' | 'portfolioId' | 'createdAt'>) => 
      PortfolioService.addCertification(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}

export function useUpdateCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PortfolioCertification> }) => 
      PortfolioService.updateCertification(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}

export function useDeleteCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => PortfolioService.deleteCertification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}
