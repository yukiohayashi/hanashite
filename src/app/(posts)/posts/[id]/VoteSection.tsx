'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

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
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');

  const totalVotes = choices.reduce((sum, choice) => sum + (choice.vote_count || 0), 0);

  // 円グラフ用のカラーパレット（視認性の高い色）
  const COLORS = ['#4DB6AC', '#FF6B6B', '#FFD93D', '#6BCF7F', '#A78BFA', '#FB923C', '#EC4899', '#14B8A6'];

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
        // 投票後：結果表示
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-3">
            <p className="font-semibold text-gray-700 text-sm">総投票数: {totalVotes}票</p>
            <div className="flex gap-2">
              <button
                onClick={() => setChartType('bar')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  chartType === 'bar'
                    ? 'bg-[#4DB6AC] text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                横棒グラフ
              </button>
              <button
                onClick={() => setChartType('pie')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  chartType === 'pie'
                    ? 'bg-[#4DB6AC] text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                円グラフ
              </button>
            </div>
          </div>

          {chartType === 'bar' ? (
            // 横棒グラフ表示
            choices.map((choice) => {
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
            })
          ) : (
            // 円グラフ表示
            <div className="w-full">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={choices.map((choice) => ({
                      name: choice.choice,
                      value: choice.vote_count
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ percent }) => {
                      const percentage = (percent * 100).toFixed(1);
                      return percentage !== '0.0' ? `${percentage}%` : '';
                    }}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    strokeWidth={2}
                    stroke="#fff"
                  >
                    {choices.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string) => [`${value}票`, name]}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #ccc',
                      borderRadius: '8px',
                      padding: '8px 12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* 詳細データ表示 */}
              <div className="mt-4 space-y-2.5">
                {choices.map((choice, index) => {
                  const percentage = totalVotes > 0 ? (choice.vote_count / totalVotes) * 100 : 0;
                  return (
                    <div key={choice.id} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-5 h-5 rounded-md flex-shrink-0 shadow-sm"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium text-gray-800 text-sm">{choice.choice}</span>
                      </div>
                      <span className="font-bold text-gray-900 text-sm whitespace-nowrap ml-2">
                        {choice.vote_count}票 ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* 投票情報バー */}
          <div className="bg-gray-50 px-3 py-2 rounded text-gray-600 text-xs flex justify-between items-center">
            <div>
              {closeAt && closeAt !== '0000-00-00' && (
                <>
                  締切：
                  {new Date(closeAt).toLocaleDateString('ja-JP', {
                    year: '2-digit',
                    month: '2-digit',
                    day: '2-digit'
                  }).replace(/\//g, '.')}
                  {' '}
                  {new Date(closeAt).toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  })}
                  ／
                </>
              )}
              {createdAt && (
                <>
                  受付：
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
                </>
              )}
            </div>
            <a href={`/report/?url=${encodeURIComponent(`/posts/${postId}`)}`} className="underline text-gray-600" target="_parent">通報</a>
          </div>
        </div>
      )}
    </div>
  );
}
