import { Route, Routes } from 'react-router-dom';
import { GarmentEditor } from './GarmentEditor';
import { WardrobeGrid } from './WardrobeGrid';
import './wardrobe.css';

export function WardrobePage() {
  return (
    <Routes>
      <Route index element={<WardrobeGrid />} />
      <Route path="neu" element={<GarmentEditor />} />
      <Route path=":id" element={<GarmentEditor key="edit" />} />
    </Routes>
  );
}
