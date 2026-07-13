import { useState } from 'react';
import { BookOpen, ChevronRight } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { Card, Badge, CopyrightFooter } from '../components/ui';
import { helpContent } from '../i18n/help-content';
import { APP_VERSION, VERSION_HISTORY, APP_REPOSITORY } from '@shared/version';
import clsx from 'clsx';

export function HelpPage() {
  const { lang } = useWallet();
  const help = helpContent[lang];
  const [activeId, setActiveId] = useState(help.sections[0]?.id ?? 'intro');

  const activeSection = help.sections.find((s) => s.id === activeId) ?? help.sections[0];

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <BookOpen className="text-brand-400" size={28} />
            <h1 className="text-2xl font-bold">{help.pageTitle}</h1>
          </div>
          <p className="text-gray-400">{help.pageSubtitle}</p>
        </div>
        <Badge variant="success">
          {help.versionLabel}: v{APP_VERSION}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit space-y-1 p-3">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {help.toc}
          </p>
          {help.sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveId(section.id)}
              className={clsx(
                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition',
                activeId === section.id
                  ? 'bg-brand-500/15 text-brand-300'
                  : 'text-gray-400 hover:bg-surface-700 hover:text-white'
              )}
            >
              <ChevronRight
                size={14}
                className={clsx('shrink-0', activeId === section.id && 'text-brand-400')}
              />
              <span className="line-clamp-2">{section.title}</span>
            </button>
          ))}
        </Card>

        <div className="space-y-6">
          {activeSection && (
            <Card className="space-y-4">
              <h2 className="text-xl font-semibold text-brand-300">{activeSection.title}</h2>
              <ul className="space-y-3">
                {activeSection.content.map((line, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed text-gray-300">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                    {line}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="space-y-4">
            <h2 className="text-lg font-semibold">{help.changelog}</h2>
            <div className="space-y-4">
              {VERSION_HISTORY.map((entry) => (
                <div key={entry.version} className="border-l-2 border-brand-500/30 pl-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-brand-400">v{entry.version}</span>
                    <span className="text-xs text-gray-500">{entry.date}</span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {entry.changes.map((change, i) => (
                      <li key={i} className="text-sm text-gray-400">
                        • {change}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
      <CopyrightFooter className="mt-8" showSignature />
      <p className="mt-1 text-center text-xs text-gray-700">
        <a href={APP_REPOSITORY} className="text-brand-400 hover:underline" target="_blank" rel="noreferrer">
          {APP_REPOSITORY}
        </a>
      </p>
    </div>
  );
}
