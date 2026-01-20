import { prisma } from '../lib/prisma';

export interface CreatePollDto {
  question: string;
  options: string[]; // ['Option 1', 'Option 2']
  durationDays: number;
}

export class PollService {
  async createPoll(postId: string, data: CreatePollDto) {
    const { question, options, durationDays } = data;

    if (options.length < 2 || options.length > 4) {
      throw new Error('Poll must have between 2 and 4 options');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    return prisma.poll.create({
      data: {
        postId,
        question,
        expiresAt,
        options: {
            create: options.map((text, index) => ({
                text,
                order: index
            }))
        }
      },
      include: {
        options: {
            orderBy: { order: 'asc' }
        }
      }
    });
  }

  async vote(pollOptionId: string, userId: string) {
    // 1. Get the option to find the poll
    const option = await prisma.pollOption.findUnique({
        where: { id: pollOptionId },
        include: { poll: true }
    });

    if (!option) throw new Error('Poll option not found');

    const poll = option.poll;

    // 2. Check expiry
    if (new Date() > poll.expiresAt) {
        throw new Error('Poll has ended');
    }

    // 3. Check if user already voted in this poll
    const existingVote = await prisma.pollVote.findFirst({
        where: {
            pollId: poll.id,
            userId
        }
    });

    if (existingVote && existingVote.pollOptionId === pollOptionId) {
        // Same option, do nothing
        return prisma.poll.findUnique({
            where: { id: poll.id },
            include: {
                options: { orderBy: { order: 'asc' } },
                votes: { where: { userId } }
            }
        });
    }

    // 4. Create vote transaction
    const result = await prisma.$transaction(async (tx) => {
        // If changing vote, remove old one and decrement count
        if (existingVote) {
             await tx.pollVote.delete({
                 where: { id: existingVote.id }
             });

             await tx.pollOption.update({
                 where: { id: existingVote.pollOptionId },
                 data: { voteCount: { decrement: 1 } }
             });
        }

        // Create new vote
        await tx.pollVote.create({
            data: {
                pollId: poll.id,
                pollOptionId,
                userId
            }
        });

        // Increment count for new option
        await tx.pollOption.update({
            where: { id: pollOptionId },
            data: { voteCount: { increment: 1 } }
        });

        // Return updated poll
        return tx.poll.findUnique({
            where: { id: poll.id },
            include: {
                options: {
                    orderBy: { order: 'asc' }
                },
                votes: {
                    where: { userId } // Return user's vote for UI state
                }
            }
        });
    });

    return result;
  }
}
