/**
 * Second step before deleting a question or a report: the admin must type the
 * word «حذف», so a single misplaced click can't delete anything.
 *
 *   if (confirmDelete("حذف هذا السؤال؟")) remove();
 */
export function confirmDelete(what: string): boolean {
  const typed = window.prompt(`${what}\n\nلا يمكن التراجع عن الحذف. للتأكيد اكتب كلمة: حذف`);
  if (typed === null) return false; // cancelled
  // Ignore spaces, tatweel and direction marks a phone keyboard may add.
  if (typed.replace(/[\sـ‎‏]/g, "") === "حذف") return true;
  window.alert("لم يُحذف شيء: يجب كتابة كلمة «حذف» للتأكيد.");
  return false;
}
