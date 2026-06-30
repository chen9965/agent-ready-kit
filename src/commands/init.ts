import { Command } from "commander";
import pc from "picocolors";
import { generateFiles, writeGeneratedFiles } from "../core/generator.js";
import { scanRepository } from "../core/scanner.js";

export function initCommand(): Command {
  return new Command("init")
    .description("Generate AGENTS.md, task cards, guards, and a report / 生成代理说明、任务卡、守护规则和报告")
    .argument("[path]", "repository path / 仓库路径", ".")
    .option("--write", "write files / 写入文件")
    .option("--dry-run", "preview files without writing / 仅预览不写入")
    .option("--force", "overwrite existing generated files / 覆盖已有生成文件")
    .action(async (targetPath: string, options: { write?: boolean; dryRun?: boolean; force?: boolean }) => {
      const scan = await scanRepository(targetPath);
      const files = generateFiles(scan);

      if (!options.write || options.dryRun) {
        console.log(pc.bold("Dry run / 预览模式"));
        for (const file of files) {
          console.log(`- ${file.path}: ${file.description}`);
        }
        console.log("\nRun with --write to create files. / 使用 --write 写入文件。");
        return;
      }

      const result = await writeGeneratedFiles(scan.root, files, { force: options.force });
      console.log(pc.green(`Written / 已写入: ${result.written.length}`));
      for (const file of result.written) console.log(`- ${file}`);

      if (result.skipped.length > 0) {
        console.log(pc.yellow(`Skipped existing files / 已跳过已有文件: ${result.skipped.length}`));
        for (const file of result.skipped) console.log(`- ${file}`);
        console.log("Use --force to overwrite. / 使用 --force 覆盖。");
      }
    });
}
