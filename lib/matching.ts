import type { Profile, WorkPost, MatchResult } from '@/lib/types';

export function calculateMatch(
  post: WorkPost,
  profile: Profile,
  preferences?: { work_types: string[]; remote_preference: string; expected_pay: number | null } | null
): MatchResult {
  const reasons: string[] = [];
  let score = 0;
  let total = 0;

  // Skills match
  total++;
  if (post.skills && post.skills.length > 0 && profile.skills && profile.skills.length > 0) {
    const matchingSkills = post.skills.filter(s => profile.skills.includes(s));
    if (matchingSkills.length > 0) {
      score++;
      reasons.push(`Skills match (${matchingSkills.length})`);
    }
  } else if (!post.skills || post.skills.length === 0) {
    score += 0.5;
  }

  // Work type match
  total++;
  if (preferences?.work_types && preferences.work_types.length > 0) {
    if (preferences.work_types.includes(post.work_type)) {
      score++;
      reasons.push('Work type match');
    }
  } else {
    score += 0.5;
  }

  // Remote preference match
  total++;
  if (preferences?.remote_preference && preferences.remote_preference !== 'any') {
    if (preferences.remote_preference === post.remote_type) {
      score++;
      reasons.push('Location match');
    }
  } else {
    score += 0.5;
    if (post.remote_type === 'remote') reasons.push('Remote available');
  }

  // Experience level match
  total++;
  const levelOrder = ['entry', 'junior', 'mid', 'senior', 'lead', 'executive'];
  const profileLevel = levelOrder.indexOf(profile.experience_level || 'entry');
  const postLevel = levelOrder.indexOf(post.experience_level || 'entry');
  if (profileLevel >= postLevel - 1 && profileLevel <= postLevel + 1) {
    score++;
    reasons.push('Experience match');
  }

  // Pay expectation
  total++;
  if (preferences?.expected_pay && post.pay_amount) {
    if (post.pay_amount >= preferences.expected_pay * 0.8) {
      score++;
      reasons.push('Compensation match');
    }
  } else {
    score += 0.5;
  }

  const percentage = Math.round((score / total) * 100);
  const level: MatchResult['level'] = percentage >= 75 ? 'strong' : percentage >= 50 ? 'good' : 'weak';

  return { score: percentage, level, reasons };
}
