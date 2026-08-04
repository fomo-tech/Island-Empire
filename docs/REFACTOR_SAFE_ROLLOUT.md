# Refactor Safe Rollout Playbook

Muc tieu: refactor code clean va component architecture ma khong gay regression lon.

## 1) Nguyen tac an toan

- Refactor theo tung feature nho, khong big-bang.
- Moi pull request chi nen co 1 muc tieu kien truc ro rang.
- Khong doi behavior cung luc voi doi structure neu khong can thiet.
- Luon co rollback point (git tag hoac branch snapshot) truoc moi dot lon.

## 2) Scope va branch strategy

- Nhanh chinh: main
- Nhanh lam viec: refactor/<feature>-<slice>
- Moi slice refactor:
  - Toi da 5-12 files neu co the
  - Toi da 1 luong nghiep vu (vd: modal chat, kingdom UI, battle report)

Lenh goi y:

```bash
git checkout -b refactor/chat-modal-shell
git tag pre-refactor-chat-modal-shell
```

## 3) Quality gates bat buoc truoc merge

Chay tai root:

```bash
npm run typecheck
npm run build
```

Neu dot refactor lien quan runtime, chay them local smoke:

```bash
npm run dev:server
npm run dev:game
npm run dev:admin
```

Gate pass khi:

- TypeScript khong error.
- Build pass tat ca package/apps.
- Luong chinh co the thao tac duoc: login, vao game, mo modal, thao tac admin can ban.

## 4) Trinh tu refactor de an toan

### Phase A - Chuan hoa khung component

- Tao cau truc theo feature:
  - features/<feature>/components
  - features/<feature>/hooks
  - features/<feature>/services
  - features/<feature>/types
- Chua doi logic, chi di chuyen va doi import.
- Chay gate sau moi batch nho.

### Phase B - Tach logic ra hooks/services

- Di chuyen side effects va business logic khoi JSX.
- UI component giu vai tro rendering + event wiring.
- Neu can doi ten symbol, dung rename theo language server de tranh sai import.

### Phase C - Chuan hoa shared UI

- Trich xuat modal shell, button/action footer, reusable badge/icon wrapper.
- Shared UI khong duoc import store/API truc tiep.

### Phase D - Hardening

- Giam component qua lon (> 200 dong) bang cach tach theo trach nhiem.
- Them test cho hooks/service quan trong (neu bo test duoc them).
- Cap nhat docs de team follow dong bo.

## 5) PR checklist (copy vao mo ta PR)

- [ ] Slice nho, dung 1 muc tieu.
- [ ] Khong doi behavior (hoac neu co, da mo ta ro).
- [ ] `npm run typecheck` pass.
- [ ] `npm run build` pass.
- [ ] Da smoke test local luong chinh lien quan.
- [ ] Import graph khong tao cycle moi.
- [ ] Component moi tuan thu phan lop: Page -> Feature -> Shared UI.

## 6) Rollback plan

Neu phat hien regression sau merge:

1. Xac dinh PR gay regression.
2. Revert nhanh PR do (khong sua nong tren main).
3. Chay lai:

```bash
npm run typecheck
npm run build
```

4. Mo issue follow-up voi:
- Root cause
- Pham vi anh huong
- Ke hoach fix lai theo slice nho hon

## 7) Mau ke hoach 2 tuan

Tuan 1:

- Ngay 1-2: Phase A cho 1-2 feature lon (vd: chat, kingdom).
- Ngay 3-4: Phase B cho feature dau tien.
- Ngay 5: Smoke test + fix import/dependency debt.

Tuan 2:

- Ngay 1-2: Phase B feature thu 2.
- Ngay 3: Phase C shared modal shell.
- Ngay 4: Phase D hardening.
- Ngay 5: Tong ket metrics (so component lon giam, so file clean).

## 8) Metrics theo doi

- So component > 200 dong.
- So component co business logic + JSX tron chung.
- So import cycle.
- So bug UI regression sau refactor.

Muc tieu de xuat sau 2 tuan:

- Giam >= 30% component > 200 dong.
- Khong co regression nghiem trong tren luong core.
- Team co checklist PR dong nhat va ap dung that su.
