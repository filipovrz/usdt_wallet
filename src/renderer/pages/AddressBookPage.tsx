import { useEffect, useState } from 'react';

import { Plus, Trash2 } from 'lucide-react';

import { useWallet } from '../context/WalletContext';

import { Button, Card, Input, NetworkSelector, ErrorAlert, LoadingSpinner } from '../components/ui';

import type { AddressBookEntry, NetworkId } from '@shared/types';

import { useNotify } from '../hooks/useNotify';



export function AddressBookPage() {

  const { t } = useWallet();

  const notify = useNotify();

  const [entries, setEntries] = useState<AddressBookEntry[]>([]);

  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');

  const [address, setAddress] = useState('');

  const [network, setNetwork] = useState<NetworkId>('tron');

  const [note, setNote] = useState('');

  const [error, setError] = useState('');

  const [search, setSearch] = useState('');



  const load = async () => {

    const res = await window.walletApi.getAddressBook();

    if (res.success && res.data) setEntries(res.data);

  };



  useEffect(() => {

    load();

  }, []);



  const handleAdd = async (e: React.FormEvent) => {

    e.preventDefault();

    setError('');

    const res = await window.walletApi.addAddressBook({ name, address, network, note });

    if (res.success) {

      setShowForm(false);

      setName('');

      setAddress('');

      setNote('');

      notify.success(notify.t.toast.contactAdded);

      load();

    } else {
      const msg = res.error === 'INVALID_ADDRESS' ? t.invalidAddress : notify.apiError(res.error);
      if (res.error === 'INVALID_ADDRESS') notify.error(t.invalidAddress);
      setError(msg);
    }

  };



  const handleDelete = async (id: string) => {

    const res = await window.walletApi.removeAddressBook(id);

    if (res.success) {

      notify.success(notify.t.toast.contactRemoved);

      load();

    } else {

      notify.apiError(res.error);

    }

  };



  const filtered = entries.filter(

    (e) =>

      e.name.toLowerCase().includes(search.toLowerCase()) ||

      e.address.toLowerCase().includes(search.toLowerCase())

  );



  return (

    <div className="p-8 space-y-6">

      <div className="flex items-center justify-between">

        <h1 className="text-2xl font-bold">{t.addressBook}</h1>

        <Button onClick={() => setShowForm(!showForm)}>

          <Plus size={16} />

          {t.addContact}

        </Button>

      </div>



      <Input

        placeholder={t.searchContact}

        value={search}

        onChange={(e) => setSearch(e.target.value)}

      />



      {showForm && (

        <Card>

          <form onSubmit={handleAdd} className="space-y-4">

            <NetworkSelector value={network} onChange={setNetwork} />

            <Input label={t.contactName} value={name} onChange={(e) => setName(e.target.value)} />

            <Input label={t.address} value={address} onChange={(e) => setAddress(e.target.value)} />

            <Input label={t.note} value={note} onChange={(e) => setNote(e.target.value)} />

            {error && <ErrorAlert message={error} />}

            <Button type="submit">{t.addContact}</Button>

          </form>

        </Card>

      )}



      <Card>

        {filtered.length === 0 ? (

          <p className="py-8 text-center text-gray-500">—</p>

        ) : (

          <div className="divide-y divide-surface-700">

            {filtered.map((entry) => (

              <div key={entry.id} className="flex items-center justify-between py-4">

                <div>

                  <p className="font-semibold">{entry.name}</p>

                  <p className="font-mono text-xs text-gray-500">{entry.address}</p>

                  <p className="text-xs text-gray-600">{entry.network.toUpperCase()}</p>

                </div>

                <Button variant="ghost" onClick={() => handleDelete(entry.id)}>

                  <Trash2 size={16} className="text-red-400" />

                </Button>

              </div>

            ))}

          </div>

        )}

      </Card>

    </div>

  );

}

