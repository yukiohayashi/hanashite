import { getPostsCount } from '@/lib/getPostsCount';
import Header from './Header';

export const revalidate = 3600; // 1時間ごとに再検証

export default async function LayoutWithHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  const postsCount = await getPostsCount();

  return (
    <>
      <Header postsCount={postsCount} />
      {children}
    </>
  );
}
