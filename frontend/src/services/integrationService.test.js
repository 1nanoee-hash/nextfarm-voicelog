import assert from "node:assert/strict";

import {
  saveDynamicOperation,
} from "./integrationService.js";


const fetchCalls = [];

globalThis.fetch = async (
  url,
  options
) => {
  fetchCalls.push({
    url,
    options,
  });

  return {
    ok: true,
    status: 200,

    async json() {
      return {
        success: true,
        data: {},
      };
    },
  };
};


function getLastRequest() {
  assert.ok(
    fetchCalls.length > 0,
    "Expected fetch to be called."
  );

  const call =
    fetchCalls[
      fetchCalls.length - 1
    ];

  return {
    url: call.url,
    options: call.options,
    body: JSON.parse(
      call.options.body
    ),
  };
}


const geometry = {
  type: "Polygon",
  coordinates: [
    [
      [
        105.97,
        20.25,
      ],
      [
        105.971,
        20.25,
      ],
      [
        105.971,
        20.251,
      ],
      [
        105.97,
        20.25,
      ],
    ],
  ],
};


// CREATE_PLOT must forward geometry.
await saveDynamicOperation(
  "CREATE_PLOT",
  "plot-geometry-test-001",
  {
    plot_name_or_code:
      "Plot Geometry Test 001",
    region_text:
      "Phia Dong",
    boundary_required:
      true,
    geometry,
  }
);

{
  const request =
    getLastRequest();

  assert.equal(
    request.url,
    "http://127.0.0.1:8002/api/plots"
  );

  assert.equal(
    request.options.method,
    "POST"
  );

  assert.equal(
    request.body.client_record_id,
    "plot-geometry-test-001"
  );

  assert.equal(
    request.body.confirmed,
    true
  );

  assert.deepEqual(
    request.body.geometry,
    geometry
  );
}


// Geometry must not be invented when it is absent.
await saveDynamicOperation(
  "CREATE_PLOT",
  "plot-geometry-test-002",
  {
    plot_name_or_code:
      "Plot Geometry Test 002",
    region_text:
      "Phia Dong",
    boundary_required:
      false,
  }
);

{
  const request =
    getLastRequest();

  assert.equal(
    Object.prototype.hasOwnProperty.call(
      request.body,
      "geometry"
    ),
    false
  );
}


// Explicit null geometry must remain null.
await saveDynamicOperation(
  "CREATE_PLOT",
  "plot-geometry-test-003",
  {
    plot_name_or_code:
      "Plot Geometry Test 003",
    region_text:
      "Phia Dong",
    boundary_required:
      false,
    geometry: null,
  }
);

{
  const request =
    getLastRequest();

  assert.equal(
    request.body.geometry,
    null
  );
}


// Other operations must not leak geometry into their payload.
await saveDynamicOperation(
  "CREATE_TASK",
  "task-geometry-test-001",
  {
    season_text:
      "Season 001",
    task_name:
      "Test task",
    task_type_text:
      "Test",
    geometry,
  }
);

{
  const request =
    getLastRequest();

  assert.equal(
    Object.prototype.hasOwnProperty.call(
      request.body,
      "geometry"
    ),
    false
  );
}


console.log(
  "Integration Service geometry tests passed."
);
