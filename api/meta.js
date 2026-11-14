import { handle, send, BANK, TOTAL, BLOCK } from './_lib/core.js';
export default handle(async (req, res) => {
  send(res, 200, {
    total: TOTAL, block: BLOCK,
    sections: BANK.sections.map(({ id, title, count, topics }) => ({ id, title, count, topics })),
    books: BANK.books,
  });
});
