/** Shape of jobs.json: assigning the imported JSON to this type catches typos at compile time. */
export interface JobsData {
  /** Keyword typed into the job search box. Results are relevance-sorted, not strictly filtered. */
  searchKeyword: string;
}
