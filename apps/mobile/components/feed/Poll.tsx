import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import clsx from 'clsx';
import { Poll as PollType, PollOption as PollOptionType } from './PostItem';

interface PollProps {
  id: string; // Poll ID
  question: string;
  options: PollOptionType[];
  totalVotes: number;
  timeLeft: string; // "Just now" | "1 day left" | "Ended"
  hasVoted?: boolean;
  userVotedOptionId?: string;
  onVote?: (pollId: string, optionId: string) => void;
  isVoting?: boolean;
  canVote?: boolean;
}

export function Poll({ 
    id, 
    question, 
    options, 
    totalVotes, 
    timeLeft, 
    hasVoted, 
    userVotedOptionId,
    onVote,
    isVoting 
}: PollProps) {

  // Calculate percentages based on total votes
  const getPercentage = (votes: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  // Find the max votes to highlight the winner
  const maxVotes = Math.max(...options.map(o => o.votes), 0);

  return (
    <View className="mb-4 mt-2 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-900/30">
      <Text className="text-base font-bold leading-snug mb-4 dark:text-white">
        {question}
      </Text>

      <View className="space-y-3 mb-4">
        {options.sort((a, b) => a.order - b.order).map((option) => {
           const percentage = getPercentage(option.votes);
           const isWinning = totalVotes > 0 && option.votes === maxVotes;
           const isSelected = userVotedOptionId === option.id;
           
           // If user has voted, show results. If not, show buttons to vote.
           const showResults = hasVoted;

           return (
             <TouchableOpacity 
                key={option.id} 
                activeOpacity={showResults ? 0.7 : 0.7} 
                onPress={() => {
                    // Allow voting if not voting currently, and either hasn't voted OR is switching vote
                    if (!isVoting && onVote) {
                         onVote(id, option.id);
                    }
                }}
                disabled={isVoting}
                className="group relative"
             >
                {/* Progress Bar Background */}
                {showResults && (
                    <View className="absolute inset-0 rounded-lg overflow-hidden bg-transparent">
                         <View 
                            className={clsx(
                                "h-full rounded-lg opacity-20",
                                isSelected ? "bg-[#1990e6]" : "bg-slate-200 dark:bg-slate-700"
                            )}
                            style={{ width: `${percentage}%` }} 
                         />
                    </View>
                )}

                <View className={clsx(
                    "flex-row items-center justify-between px-4 py-3 rounded-lg border",
                    showResults 
                        ? "border-transparent" 
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800",
                    isSelected && "border-[#1990e6]"
                )}>
                   <View className="flex-row items-center flex-1 gap-2">
                       {/* Selection Indicator */}
                       {showResults && isSelected && (
                           <MaterialIcons name="check-circle" size={16} color="#1990e6" />
                       )}
                       
                       <Text className={clsx(
                           "font-medium flex-1",
                           isSelected ? "text-[#1990e6]" : "text-slate-700 dark:text-gray-300"
                       )}>
                           {option.text}
                       </Text>
                   </View>

                   {/* Percentage / Vote Count */}
                   {showResults && (
                       <Text className={clsx("text-sm font-bold", isSelected ? "text-[#1990e6]" : "text-slate-500")}>
                           {percentage}%
                       </Text>
                   )}
                </View>
             </TouchableOpacity>
           );
        })}
      </View>

      <View className="flex-row items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800/50">
        <Text className="text-slate-400 dark:text-slate-500 font-medium text-xs">
          {totalVotes.toLocaleString()} votes • {timeLeft}
        </Text>
        {isVoting && <ActivityIndicator size="small" color="#1990e6" />}
      </View>
    </View>
  );
}
