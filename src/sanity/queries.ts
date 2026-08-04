/**
 * GROQ queries for fetching data from Sanity CMS
 */

/**
 * Homepage Query
 * Fetches site settings with intro video and featured projects
 */
export const homepageQuery = `{
  "settings": *[_type == "postSiteSettings"][0] {
    "introVideoUrl": coalesce(
      introVideo.asset->url,
      introVideoUrl
    ),
    featuredProjects[]-> {
      _id,
      title,
      client,
      "slug": slug.current,
      "postCategoryTitle": postCategory->title,
      "postCategorySlug": postCategory->slug.current,
      "videoUrl": coalesce(
        video.asset->url,
        videoUrl
      ),
      "imageUrl": heroImage.asset->url,
      postWorkDescription,
      description,
      postScrollSubtitles,
      postCredits[] {
        discipline,
        role,
        "worker": worker-> {
          name,
          "slug": slug.current,
          "categoryTitle": category->title
        }
      }
    }
  },
  "allProjects": *[_type == "project" && hasPostProduction == true] | order(coalesce(postSortOrder, 999999) asc, _createdAt desc) {
    _id,
    title,
    client,
    "slug": slug.current,
    "postCategoryTitle": postCategory->title,
    "postCategorySlug": postCategory->slug.current,
    postSortOrder,
    "videoUrl": coalesce(
      video.asset->url,
      videoUrl
    ),
    "imageUrl": heroImage.asset->url,
    postWorkDescription,
    description,
    postScrollSubtitles,
    postCredits[] {
      discipline,
      role,
      order,
      "worker": worker-> {
        name,
        "slug": slug.current,
        "categoryTitle": category->title
      }
    }
  }
}`;

/**
 * First project media for a worker filtered by discipline (used in roster hover).
 */
const featuredProjectByDiscipline = (discipline: string) => `*[
  _type == "project"
  && hasPostProduction == true
  && references(^._id)
  && "${discipline}" in postCredits[].discipline
  && ^._id in postCredits[discipline == "${discipline}"].worker._ref
] | order(coalesce(postCredits[worker._ref == ^._id && discipline == "${discipline}"][0].order, 999999) asc, _createdAt desc) [0] {
  _id,
  title,
  "videoUrl": coalesce(video.asset->url, videoUrl),
  "imageUrl": heroImage.asset->url
}`;

/**
 * Talent Roster Query
 * Fetches all post workers/talent with first-project media per discipline
 */
export const talentRosterQuery = `*[_type == "postWorker"] | order(order asc, name asc) {
  _id,
  name,
  "slug": slug.current,
  categories,
  "categorySlug": coalesce(categories[0], category->slug.current),
  "categoryTitle": category->title,
  bio,
  "imageUrl": image.asset->url,
  featuredWorkTitle,
  order,
  roleOrders[] {
    role,
    order
  },
  "featuredByDiscipline": {
    "edit": ${featuredProjectByDiscipline("edit")},
    "color": ${featuredProjectByDiscipline("color")},
    "sound": ${featuredProjectByDiscipline("sound")},
    "vfx": ${featuredProjectByDiscipline("vfx")}
  }
}`;

/**
 * Talent Detail Query
 * Fetches a single post worker with their projects filtered by discipline
 */
export const talentDetailQuery = `*[_type == "postWorker" && slug.current == $slug][0] {
  _id,
  name,
  categories,
  "categorySlug": coalesce(categories[0], category->slug.current),
  "categoryTitle": category->title,
  bio,
  "imageUrl": image.asset->url,
  featuredWorkTitle,
  "projects": *[
    _type == "project" 
    && hasPostProduction == true 
    && references(^._id)
    && $discipline in postCredits[].discipline
    && ^._id in postCredits[discipline == $discipline].worker._ref
  ] | order(coalesce(postCredits[worker._ref == ^._id && discipline == $discipline][0].order, 999999) asc, _createdAt desc) {
    _id,
    title,
    client,
    "slug": slug.current,
    "postCategoryTitle": postCategory->title,
    "postCategorySlug": postCategory->slug.current,
    "videoUrl": coalesce(
      video.asset->url,
      videoUrl
    ),
    "imageUrl": heroImage.asset->url,
    postWorkerDescription,
    "sortOrder": postCredits[worker._ref == ^._id && discipline == $discipline][0].order
  }
}`;

/**
 * Post Categories Query
 * Fetches all post production categories
 */
export const postCategoriesQuery = `*[_type == "postCategory"] | order(order asc) {
  _id,
  title,
  "slug": slug.current,
  order
}`;

/**
 * Site Settings Query (for info pages)
 * Fetches about, contact, and management info
 */
export const siteSettingsQuery = `*[_type == "postSiteSettings"][0] {
  aboutParagraphs,
  contactEmail,
  offices[] {
    label,
    address,
    phone
  },
  management[] {
    name,
    title,
    email
  }
}`;
