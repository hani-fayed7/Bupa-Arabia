/** Shapes of the JSON test data: assigning an imported file to its type catches typos at compile time. */

/** jobs.json */
export interface JobsData {
  /** Keyword typed into the job search box. Results are relevance-sorted, not strictly filtered. */
  searchKeyword: string;
}

export interface Credentials {
  email: string;
  password: string;
}

/** invalid-users.json: made-up accounts only, never the real test account (avoids lockouts). */
export interface InvalidUsersData {
  unknownAccount: Credentials;
}
