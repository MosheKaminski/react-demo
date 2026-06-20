import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Stack,
  Typography,
  TextField,
  MenuItem,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../lib/useAuth';
import { useDeleteDocument, useDocuments, useUploadDocument } from '../features/documents/hooks';
import { getDocumentSignedUrl } from '../features/documents/api';
import type { DocumentType } from '../types/domain';

interface EmployeeDocumentsSectionProps {
  employeeId: string;
}

const DOCUMENT_TYPES: DocumentType[] = ['contract', 'id_copy', 'receipt', 'other'];

export function EmployeeDocumentsSection({ employeeId }: EmployeeDocumentsSectionProps) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { data: documents } = useDocuments(employeeId);
  const uploadDocument = useUploadDocument(employeeId);
  const deleteDocument = useDeleteDocument(employeeId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<DocumentType>('contract');

  const handleFileSelected = (file: File | undefined) => {
    if (!file || !session) return;
    uploadDocument.mutate({ type, file, uploadedBy: session.user.id });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = async (path: string) => {
    const url = await getDocumentSignedUrl(path);
    window.open(url, '_blank');
  };

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2">{t('documents.title')}</Typography>
      <List dense>
        {(documents ?? []).map((doc) => (
          <ListItem
            key={doc.id}
            disableGutters
            secondaryAction={
              <IconButton edge="end" onClick={() => deleteDocument.mutate(doc)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            }
          >
            <ListItemText
              primary={
                <Button size="small" onClick={() => handleDownload(doc.file_path)}>
                  {t(`documents.type.${doc.type}`)} — {doc.file_path.split('/').pop()}
                </Button>
              }
              secondary={new Date(doc.uploaded_at).toLocaleString()}
            />
          </ListItem>
        ))}
        {(documents ?? []).length === 0 && (
          <Typography variant="body2" color="text.secondary">
            {t('documents.none')}
          </Typography>
        )}
      </List>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <TextField
          select
          size="small"
          label={t('documents.documentType')}
          value={type}
          onChange={(e) => setType(e.target.value as DocumentType)}
          sx={{ minWidth: 140 }}
        >
          {DOCUMENT_TYPES.map((docType) => (
            <MenuItem key={docType} value={docType}>
              {t(`documents.type.${docType}`)}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="outlined"
          component="label"
          disabled={uploadDocument.isPending}
        >
          {t('documents.upload')}
          <input
            ref={fileInputRef}
            type="file"
            hidden
            onChange={(e) => handleFileSelected(e.target.files?.[0])}
          />
        </Button>
      </Stack>
    </Stack>
  );
}
