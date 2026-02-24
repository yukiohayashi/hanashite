'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PointRecord {
  id: number;
  points?: number;
  amount?: number;
  type: string;
  created_at: string;
}

const getPointTypeLabel = (type: string): string => {
  const labels: { [key: string]: string } = {
    'regist': 'ユーザー登録',
    'login': 'ログイン',
    'post': '一般投稿',
    'comment': 'コメント',
    'best_answer': 'ベストアンサー',
    'incentive': 'インセンティブ',
    'campaign': 'キャンペーン'
  };
  return labels[type] || type;
};

export default function PointHistoryTable() {
  const [pointHistory, setPointHistory] = useState<PointRecord[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.id) {
      fetchPointHistory();
    }
  }, [session]);

  const fetchPointHistory = async () => {
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/phistory?userId=${session.user.id}`);
      
      if (!response.ok) {
        console.error('API error:', response.status, response.statusText);
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Invalid content type:', contentType);
        return;
      }

      const data = await response.json();

      if (data.success) {
        setPointHistory(data.pointHistory);
        setTotalPoints(data.totalPoints);
      } else {
        console.error('API returned error:', data.error);
      }
    } catch (error) {
      console.error('ポイント履歴の取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-300 rounded-md p-4">
        <p className="font-bold text-blue-600 text-lg mb-4">
          現在所有のハナシテpoint：{totalPoints.toLocaleString()}pt
        </p>
        <h2 className="font-bold text-lg mb-4">ポイント獲得履歴</h2>
        <div>
          {pointHistory.length === 0 ? (
            <p className="py-10 text-center text-gray-500">ポイント履歴がありません</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">獲得日付</TableHead>
                    <TableHead className="text-center">種類</TableHead>
                    <TableHead className="text-right">獲得pt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pointHistory.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-center text-sm">
                        {formatDate(record.created_at)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getPointTypeLabel(record.type)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {(() => {
                          const pointValue = record.amount !== null && record.amount !== undefined ? record.amount : (record.points || 0);
                          return `${pointValue >= 0 ? '+' : ''}${pointValue.toLocaleString()}`;
                        })()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
