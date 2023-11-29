/** The data we need to store for each type of record. */
type RecordData = {
  user: {
    userUuid: string;
    loginId: string; // provider-specific ID (eg. Github ID)
    name: string;
    profilePictureUrl: string;
  };
  solution: {
    userUuid: string;
    puzzleNamespace: string;
    puzzleName: string;
    timestamp: number;
    browserName: string;
    browserVersion: string;
    code: string;
  };
};

/**
 * Data access patterns which our table needs to handle:
 * - Get user by login ID (login)
 * - List solutions for user (login)
 */

/** Mapping of data access queries to required pk+sk data from records.
 * Used for reference when calculating the final schema next. */
type RecordIndexKeys = {
  user: [
    // Should be pk but unnecessary right now
    // { pk: "userUuid" },
    // Get user by login ID (login)
    { pk: "loginId" },
  ];
  solution: [
    // List solutions for user (login)
    { pk: "userUuid" },
  ];
};

/** Mappings of pk+sk indexes to fields in the `RecordIndexSchema` below for the
 * main index along with other GSIs. Comment is records returned by queries it is used in. */
type Indexes = [
  { pk: "pk0"; sk: "sk0" }, // all
];

// Bottleneck for GSIs is submissions, with all of the indexes above being used for the
// different submission queries.

/** Fields used as index keys.
 * Data from `RecordData` will be included in addition to these fields. */
type RecordIndexSchema = {
  user: {
    pk0: `USER/${"loginId"}`;
  };
  solution: {
    pk0: `USER/${"userUuid"}/SOLUTION`;
    sk0: `${"puzzleId"}`;
  };
};

/** Pseudo-code for all the DynamoDB queries we'll need to make using the fields in `RecordIndexSchema`.
 * Note that for every query the first assertion must be a partition key and the second and order (if they
 * exist) must be a matching range key for one of the indexes in `Indexes`. */
type Queries = [
  // Get user for login ID (login)
  `get pk0:${"loginId"}`,
  // List solutions for user (login)
  `get pk0:${"userUuid"}/solution`,
];

// The last step when planning a schema is choosing which data to project on the GSIs but that should
// be trivial so it will be done during implementation.
