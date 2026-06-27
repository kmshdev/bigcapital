// @ts-nocheck
import React, { useState } from 'react';
import {
  Button,
  Card,
  FormGroup,
  H2,
  HTMLTable,
  InputGroup,
  Intent,
  TextArea,
} from '@blueprintjs/core';
import { DashboardInsider, FormattedMessage as T } from '@/components';
import {
  useExpenseSheetImportCommit,
  useExpenseSheetImportMapping,
  useExpenseSheetImportPreview,
  useExpenseSheetImportUpload,
} from '@/hooks/query/import/queries';

const sampleRows = JSON.stringify(
  [
    {
      'Bill No': 'B-1',
      'Bill Date': '2026-06-27',
      'Basic Value': '1000.00',
      GST: '180.00',
      Payment: '1180.00',
    },
  ],
  null,
  2,
);

export function ExpenseSheetImport() {
  const [filename, setFilename] = useState('expense-sheet.xlsx');
  const [file, setFile] = useState(null);
  const [importId, setImportId] = useState('');
  const [rowsJson, setRowsJson] = useState(sampleRows);
  const [previewRows, setPreviewRows] = useState([]);
  const upload = useExpenseSheetImportUpload({
    onSuccess: (response) => {
      setImportId(String(response.id || response.importId));
      if (response.rows) {
        setRowsJson(JSON.stringify(response.rows, null, 2));
      }
    },
  });
  const mapping = useExpenseSheetImportMapping();
  const preview = useExpenseSheetImportPreview({
    onSuccess: (response) => setPreviewRows(response.rows || []),
  });
  const commit = useExpenseSheetImportCommit();

  const parsedRows = () => JSON.parse(rowsJson || '[]');

  const handleUpload = () => {
    upload.mutate({
      file,
      sourceFilename: file?.name || filename,
      uploadedByUserId: 0,
    });
  };

  const handleMapping = () => {
    const rows = parsedRows();
    mapping.mutate({
      importId,
      headers: rows.length > 0 ? Object.keys(rows[0]) : [],
    });
  };

  const handlePreview = () => {
    preview.mutate({ importId, rows: parsedRows() });
  };

  const handleCommit = () => {
    commit.mutate({ importId, rows: previewRows });
  };

  return (
    <DashboardInsider name="expense-sheet-import">
      <div style={{ padding: 24 }}>
        <H2>
          <T id="expense_sheet_import.title" />
        </H2>
        <Card elevation={0}>
          <FormGroup label={<T id="expense_sheet_import.filename" />}>
            <InputGroup
              value={filename}
              onChange={(event) => setFilename(event.target.value)}
            />
          </FormGroup>
          <FormGroup label={<T id="expense_sheet_import.title" />}>
            <InputGroup
              type="file"
              inputProps={{ accept: '.xlsx,.xls,.csv' }}
              onChange={(event) => {
                const nextFile = event.currentTarget.files?.[0] || null;
                setFile(nextFile);
                if (nextFile) {
                  setFilename(nextFile.name);
                }
              }}
            />
          </FormGroup>
          <Button intent={Intent.PRIMARY} onClick={handleUpload}>
            <T id="expense_sheet_import.create_import" />
          </Button>
          <FormGroup
            label={<T id="expense_sheet_import.import_id" />}
            style={{ marginTop: 16 }}
          >
            <InputGroup
              value={importId}
              onChange={(event) => setImportId(event.target.value)}
            />
          </FormGroup>
          <FormGroup label={<T id="expense_sheet_import.rows_json" />}>
            <TextArea
              fill
              growVertically
              value={rowsJson}
              onChange={(event) => setRowsJson(event.target.value)}
            />
          </FormGroup>
          <Button onClick={handleMapping}>
            <T id="expense_sheet_import.map_columns" />
          </Button>
          <Button style={{ marginLeft: 8 }} onClick={handlePreview}>
            <T id="expense_sheet_import.preview" />
          </Button>
          <Button
            intent={Intent.SUCCESS}
            style={{ marginLeft: 8 }}
            onClick={handleCommit}
          >
            <T id="expense_sheet_import.commit_inr" />
          </Button>
        </Card>
        <Card elevation={0} style={{ marginTop: 16 }}>
          <HTMLTable striped style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>
                  <T id="expense_sheet_import.row" />
                </th>
                <th>INR</th>
                <th>
                  <T id="expense_sheet_import.status" />
                </th>
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, index) => {
                const rowNumber = row.rowNumber ?? row.row_number ?? index + 1;

                return (
                  <tr key={rowNumber}>
                    <td>{rowNumber}</td>
                    <td>{row.values?.currencyCode || 'INR'}</td>
                    <td>
                      {row.validationErrors ? (
                        <pre>{JSON.stringify(row.validationErrors)}</pre>
                      ) : (
                        <T id="expense_sheet_import.valid" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </HTMLTable>
        </Card>
      </div>
    </DashboardInsider>
  );
}
