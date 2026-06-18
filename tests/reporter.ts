import type { Reporter, TestRunner } from "bun:test";

const reporter: Reporter = {
  onTestEnd(runner: TestRunner, test) {
    const file = test.file ? test.file.split("/").pop() : "";
    if (test.status === "pass") {
      console.log(` \x1b[32m✓\x1b[0m ${test.name} \x1b[90m(${file})\x1b[0m`);
    } else if (test.status === "fail") {
      console.log(` \x1b[31m✗\x1b[0m ${test.name} \x1b[90m(${file})\x1b[0m`);
    } else if (test.status === "skip") {
      console.log(` \x1b[36m- [SKIPPED]\x1b[0m ${test.name} \x1b[90m(${file})\x1b[0m`);
    }
  }
};

export default reporter;
