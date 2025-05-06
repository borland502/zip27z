import "@/globals";

import { Command } from "commander";
import { hello } from "@/index";

export const program = new Command();

program.name("bun-sea").description("A CLI template for bootstrapping Bun applications.").version("0.0.1");

program
  .command("hello")
  .description("Hello world command")
  .action(async () => {
    hello();
  });

program.parse(process.argv);
