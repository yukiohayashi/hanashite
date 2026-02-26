import { supabase } from './supabase';

export const revalidate = 0;

export async function getPostsCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error fetching posts count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getPostsCount:', error);
    return 0;
  }
}
