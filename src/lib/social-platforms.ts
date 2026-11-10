import type { SocialAccount, SocialPost } from '@/generated/prisma/client';

export interface PublishResult {
  success: boolean;
  externalId: string | null;
  error?: string;
}

/**
 * Publish a post to the appropriate social platform.
 *
 * Currently a stub that marks every post as successful.
 * When real API keys are available, wire each case to the
 * platform's SDK/REST API and return the external post ID.
 */
export async function publishPost(
  account: SocialAccount,
  post: SocialPost,
): Promise<PublishResult> {
  switch (account.platform) {
    // -----------------------------------------------------------------------
    // Twitter / X
    // -----------------------------------------------------------------------
    case 'twitter': {
      // TODO: Wire Twitter API v2
      // SDK: twitter-api-v2 (npm)
      // Endpoint: POST https://api.twitter.com/2/tweets
      // Auth: OAuth 2.0 Bearer or OAuth 1.0a (account.accessToken)
      // Body: { text: post.content, media?: { media_ids: [...] } }
      // Response: { data: { id: "1234567890" } }
      //
      // const client = new TwitterApi(account.accessToken);
      // const tweet = await client.v2.tweet(post.content);
      // return { success: true, externalId: tweet.data.id };
      console.log(
        `[social-platforms] STUB: Would publish to Twitter @${account.accountName}: "${post.content.slice(0, 60)}..."`,
      );
      return { success: true, externalId: null };
    }

    // -----------------------------------------------------------------------
    // Facebook
    // -----------------------------------------------------------------------
    case 'facebook': {
      // TODO: Wire Meta Graph API
      // Endpoint: POST https://graph.facebook.com/v19.0/{page-id}/feed
      // Auth: Page access token (account.accessToken)
      // Body: { message: post.content, link?: url }
      // For photos: POST /{page-id}/photos with { url, caption }
      // Response: { id: "page_post_id" }
      //
      // const res = await fetch(`https://graph.facebook.com/v19.0/${account.accountId}/feed`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ message: post.content, access_token: account.accessToken }),
      // });
      // const data = await res.json();
      // return { success: true, externalId: data.id };
      console.log(
        `[social-platforms] STUB: Would publish to Facebook page ${account.accountName}: "${post.content.slice(0, 60)}..."`,
      );
      return { success: true, externalId: null };
    }

    // -----------------------------------------------------------------------
    // Instagram
    // -----------------------------------------------------------------------
    case 'instagram': {
      // TODO: Wire Instagram Graph API (requires Facebook Business account)
      // Step 1: Create media container
      //   POST https://graph.facebook.com/v19.0/{ig-user-id}/media
      //   Body: { image_url, caption: post.content, access_token }
      // Step 2: Publish container
      //   POST https://graph.facebook.com/v19.0/{ig-user-id}/media_publish
      //   Body: { creation_id: container.id, access_token }
      // Response: { id: "ig_media_id" }
      //
      // Note: Instagram API requires an image_url for feed posts.
      // Reels use video_url. Text-only posts are not supported.
      console.log(
        `[social-platforms] STUB: Would publish to Instagram @${account.accountName}: "${post.content.slice(0, 60)}..."`,
      );
      return { success: true, externalId: null };
    }

    // -----------------------------------------------------------------------
    // LinkedIn
    // -----------------------------------------------------------------------
    case 'linkedin': {
      // TODO: Wire LinkedIn API v2
      // Endpoint: POST https://api.linkedin.com/v2/ugcPosts
      // Auth: OAuth 2.0 Bearer token (account.accessToken)
      // Body: {
      //   author: "urn:li:person:{account.accountId}",
      //   lifecycleState: "PUBLISHED",
      //   specificContent: {
      //     "com.linkedin.ugc.ShareContent": {
      //       shareCommentary: { text: post.content },
      //       shareMediaCategory: "NONE"
      //     }
      //   },
      //   visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" }
      // }
      // Response: { id: "urn:li:ugcPost:12345" }
      //
      // For organization pages use author: "urn:li:organization:{id}"
      // New Posts API (v2): POST /rest/posts
      console.log(
        `[social-platforms] STUB: Would publish to LinkedIn ${account.accountName}: "${post.content.slice(0, 60)}..."`,
      );
      return { success: true, externalId: null };
    }

    default: {
      return {
        success: false,
        externalId: null,
        error: `Unsupported platform: ${account.platform}`,
      };
    }
  }
}
