'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface VoteChoice {
  id: number;
  choice: string;
  vote_count: number;
}

interface VoteSectionProps {
  postId: number;
  initialChoices: VoteChoice[];
  initialHasVoted?: boolean;
  initialVotedChoiceId?: number | null;
  closeAt?: string | null;
  commentCount?: number;
  createdAt?: string;
  multi?: boolean;
  random?: boolean;
}

export default function VoteSection({ 
  postId, 
  initialChoices, 
  initialHasVoted = false,
  initialVotedChoiceId = null,
  closeAt = null,
  commentCount = 0,
  createdAt,
  multi = false,
  random = false
}: VoteSectionProps) {
  const [choices, setChoices] = useState<VoteChoice[]>(() => {
    // ランダム表示の場合は選択肢をシャッフル
    if (random) {
      const shuffled = [...initialChoices];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
    return initialChoices;
  });
  const [selectedChoices, setSelectedChoices] = useState<number[]>([]);
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [showResults, setShowResults] = useState(false);

  const totalVotes = choices.reduce((sum, choice) => sum + (choice.vote_count || 0), 0);

  // 投票済みの場合、少し遅延してアニメーションを開始
  useEffect(() => {
    if (initialHasVoted) {
      const timer = setTimeout(() => {
        setShowResults(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialHasVoted]);

  const handleChoiceClick = (choiceId: number) => {
    if (hasVoted || !multi) return;
    
    setSelectedChoices(prev => {
      if (prev.includes(choiceId)) {
        return prev.filter(id => id !== choiceId);
      } else {
        return [...prev, choiceId];
      }
    });
  };

  const handleVote = async (choiceId?: number) => {
    if (isVoting || hasVoted) return;

    const votingChoices = multi ? selectedChoices : (choiceId ? [choiceId] : []);
    if (votingChoices.length === 0) return;

    setIsVoting(true);

    try {
      // セッションIDを取得または生成
      let sessionId = localStorage.getItem('anke_session_id');
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem('anke_session_id', sessionId);
      }

      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          choiceId: multi ? votingChoices : choiceId,
          postId,
          sessionId,
          multi,
        }),
      });

      const data = await response.json();

      if (data.success && data.choices) {
        setChoices(data.choices);
        setHasVoted(true);
        setShowResults(true);
      } else {
        alert('投票に失敗しました: ' + (data.error || '不明なエラー'));
      }
    } catch (error) {
      alert('投票に失敗しました: ' + String(error));
    } finally {
      setIsVoting(false);
    }
  };

  if (!choices || choices.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {multi && !hasVoted && (
        <div className="flex justify-between items-center mb-2">
          <p className="text-gray-600 text-sm">複数選択可能です</p>
          <Button
            onClick={() => handleVote()}
            disabled={isVoting || selectedChoices.length === 0}
            className="bg-[#ff6b35] hover:bg-[#e58a2f]"
          >
            投票する ({selectedChoices.length}件選択中)
          </Button>
        </div>
      )}
      {!hasVoted ? (
        // 投票前：選択肢ボタン
        choices.map((choice) => (
          <Button
            key={choice.id}
            onClick={() => multi ? handleChoiceClick(choice.id) : handleVote(choice.id)}
            disabled={isVoting}
            variant="outline"
            className={`w-full px-6 py-4 border-2 rounded-lg font-medium text-center transition-all duration-300 ${
              multi && selectedChoices.includes(choice.id)
                ? 'bg-[#4DB6AC] border-[#4DB6AC] text-white hover:bg-[#4DB6AC] hover:text-white'
                : 'bg-white hover:bg-[#4DB6AC] border-[#4DB6AC] text-[#4DB6AC] hover:text-white'
            }`}
          >
            {multi && (
              <span className="mr-2">
                {selectedChoices.includes(choice.id) ? '☑' : '☐'}
              </span>
            )}
            {choice.choice}
          </Button>
        ))
      ) : (
        // 投票後：結果表示（横バーアニメーション）
        <div className="space-y-3">
          <p className="mb-3 font-semibold text-gray-700 text-sm text-center">総投票数: {totalVotes}票</p>
          {choices.map((choice) => {
            const percentage = totalVotes > 0 ? (choice.vote_count / totalVotes) * 100 : 0;
            
            return (
              <div key={choice.id} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700 text-sm">{choice.choice}</span>
                  <span className="font-bold text-gray-900 text-sm">
                    {choice.vote_count}票 ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="relative bg-gray-200 rounded-full w-full h-[10px] overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-[#4DB6AC] rounded-full transition-[width] duration-1000 ease-out"
                    style={{
                      width: showResults ? `${percentage}%` : '0%',
                    }}
                  />
                </div>
              </div>
            );
          })}
          
          {/* 投票情報バー */}
          <div className="bg-gray-50 px-3 py-2 rounded text-gray-600 text-xs">
            {totalVotes}票
            {closeAt && closeAt !== '0000-00-00' && (
              <>
                {' '}締切日時：
                {new Date(closeAt).toLocaleDateString('ja-JP', {
                  year: '2-digit',
                  month: '2-digit',
                  day: '2-digit'
                }).replace(/\//g, '.')}
                {' '}
                {new Date(closeAt).toLocaleTimeString('ja-JP', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                })}
                ／
              </>
            )}
            {' '}<i className="fas fa-comment"></i>{commentCount}
            {createdAt && (
              <>
                {' '}調査期間：
                {new Date(createdAt).toLocaleDateString('ja-JP', {
                  year: '2-digit',
                  month: '2-digit',
                  day: '2-digit'
                }).replace(/\//g, '.')}
                ～
                {new Date().toLocaleDateString('ja-JP', {
                  year: '2-digit',
                  month: '2-digit',
                  day: '2-digit'
                }).replace(/\//g, '.')}
                ／
              </>
            )}
            <a href={`/report/?url=${encodeURIComponent(`/posts/${postId}`)}`} className="underline text-gray-600" target="_parent">通報</a>
          </div>
        </div>
      )}
    </div>
  );
}
