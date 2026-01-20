import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface PortfolioUpdateData {
  headline?: string;
  bio?: string;
  roleTitle?: string;
  location?: string;
  timezone?: string;
  yearsOfExperience?: number;
  resumeUrl?: string;
  portfolioUrl?: string;
  availabilityStatus?: string;
  skills?: string[];
}

export interface ProjectData {
  title: string;
  description?: string;
  url?: string;
  imageUrl?: string;
}

export interface ExperienceData {
  company: string;
  title: string;
  startDate: Date;
  endDate?: Date;
  description?: string;
}

export interface EducationData {
  institution: string;
  degree?: string;
  field?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface CertificationData {
  name: string;
  issuer?: string;
  issueDate?: Date;
  url?: string;
}

export class PortfolioService {
  // Get portfolio by user ID (public)
  async getPortfolioByUserId(userId: string) {
    const portfolio = await prisma.portfolio.findUnique({
      where: { userId },
      include: {
        projects: { orderBy: { createdAt: 'desc' } },
        experiences: { orderBy: { startDate: 'desc' } },
        education: { orderBy: { startDate: 'desc' } },
        certifications: { orderBy: { issueDate: 'desc' } },
      },
    });
    return portfolio;
  }

  // Create or update portfolio
  async upsertPortfolio(userId: string, data: PortfolioUpdateData) {
    const portfolio = await prisma.portfolio.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
      include: {
        projects: { orderBy: { createdAt: 'desc' } },
        experiences: { orderBy: { startDate: 'desc' } },
        education: { orderBy: { startDate: 'desc' } },
        certifications: { orderBy: { issueDate: 'desc' } },
      },
    });
    return portfolio;
  }

  // Get or create portfolio for user
  private async getOrCreatePortfolio(userId: string) {
    let portfolio = await prisma.portfolio.findUnique({ where: { userId } });
    if (!portfolio) {
      portfolio = await prisma.portfolio.create({ data: { userId } });
    }
    return portfolio;
  }

  // Projects
  async addProject(userId: string, data: ProjectData) {
    const portfolio = await this.getOrCreatePortfolio(userId);
    return prisma.portfolioProject.create({
      data: { portfolioId: portfolio.id, ...data },
    });
  }

  async updateProject(userId: string, projectId: string, data: Partial<ProjectData>) {
    // Verify ownership
    const project = await prisma.portfolioProject.findFirst({
      where: { id: projectId, portfolio: { userId } },
    });
    if (!project) throw new Error('Project not found');

    return prisma.portfolioProject.update({
      where: { id: projectId },
      data,
    });
  }

  async deleteProject(userId: string, projectId: string) {
    const project = await prisma.portfolioProject.findFirst({
      where: { id: projectId, portfolio: { userId } },
    });
    if (!project) throw new Error('Project not found');

    return prisma.portfolioProject.delete({ where: { id: projectId } });
  }

  // Experiences
  async addExperience(userId: string, data: ExperienceData) {
    const portfolio = await this.getOrCreatePortfolio(userId);
    return prisma.portfolioExperience.create({
      data: { portfolioId: portfolio.id, ...data },
    });
  }

  async updateExperience(userId: string, experienceId: string, data: Partial<ExperienceData>) {
    const experience = await prisma.portfolioExperience.findFirst({
      where: { id: experienceId, portfolio: { userId } },
    });
    if (!experience) throw new Error('Experience not found');

    return prisma.portfolioExperience.update({
      where: { id: experienceId },
      data,
    });
  }

  async deleteExperience(userId: string, experienceId: string) {
    const experience = await prisma.portfolioExperience.findFirst({
      where: { id: experienceId, portfolio: { userId } },
    });
    if (!experience) throw new Error('Experience not found');

    return prisma.portfolioExperience.delete({ where: { id: experienceId } });
  }

  // Education
  async addEducation(userId: string, data: EducationData) {
    const portfolio = await this.getOrCreatePortfolio(userId);
    return prisma.portfolioEducation.create({
      data: { portfolioId: portfolio.id, ...data },
    });
  }

  async updateEducation(userId: string, educationId: string, data: Partial<EducationData>) {
    const education = await prisma.portfolioEducation.findFirst({
      where: { id: educationId, portfolio: { userId } },
    });
    if (!education) throw new Error('Education not found');

    return prisma.portfolioEducation.update({
      where: { id: educationId },
      data,
    });
  }

  async deleteEducation(userId: string, educationId: string) {
    const education = await prisma.portfolioEducation.findFirst({
      where: { id: educationId, portfolio: { userId } },
    });
    if (!education) throw new Error('Education not found');

    return prisma.portfolioEducation.delete({ where: { id: educationId } });
  }

  // Certifications
  async addCertification(userId: string, data: CertificationData) {
    const portfolio = await this.getOrCreatePortfolio(userId);
    return prisma.portfolioCertification.create({
      data: { portfolioId: portfolio.id, ...data },
    });
  }

  async updateCertification(userId: string, certificationId: string, data: Partial<CertificationData>) {
    const certification = await prisma.portfolioCertification.findFirst({
      where: { id: certificationId, portfolio: { userId } },
    });
    if (!certification) throw new Error('Certification not found');

    return prisma.portfolioCertification.update({
      where: { id: certificationId },
      data,
    });
  }

  async deleteCertification(userId: string, certificationId: string) {
    const certification = await prisma.portfolioCertification.findFirst({
      where: { id: certificationId, portfolio: { userId } },
    });
    if (!certification) throw new Error('Certification not found');

    return prisma.portfolioCertification.delete({ where: { id: certificationId } });
  }
}
