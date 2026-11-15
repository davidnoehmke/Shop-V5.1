import * as React from 'react';
import {Pagination} from '@shopify/hydrogen';
import {useLocation} from 'react-router';

/**
 * <PaginatedResourceSection> encapsulates the previous and next pagination behaviors throughout your application.
 */
export function PaginatedResourceSection<NodesType>({
  connection,
  children,
  ariaLabel,
  resourcesClassName,
}: {
  connection: React.ComponentProps<typeof Pagination<NodesType>>['connection'];
  children: (args: {node: NodesType; index: number}) => React.ReactNode;
  ariaLabel?: string;
  resourcesClassName?: string;
}) {
  const {pathname} = useLocation();
  const isEnglish = pathname === '/en' || pathname.startsWith('/en/');
  return (
    <Pagination connection={connection}>
      {({nodes, isLoading, PreviousLink, NextLink}) => {
        const resourcesMarkup = nodes.map((node, index) =>
          children({node, index}),
        );

        return (
          <div>
            <PreviousLink>
              {isLoading ? (
                isEnglish ? 'Loading…' : 'Wird geladen…'
              ) : (
                <span>
                  <span aria-hidden="true">↑</span> {isEnglish ? 'Load previous' : 'Vorherige laden'}
                </span>
              )}
            </PreviousLink>
            {resourcesClassName ? (
              <div
                aria-label={ariaLabel}
                className={resourcesClassName}
                role={ariaLabel ? 'region' : undefined}
              >
                {resourcesMarkup}
              </div>
            ) : (
              <>{resourcesMarkup}</>
            )}
            <NextLink>
              {isLoading ? (
                isEnglish ? 'Loading…' : 'Wird geladen…'
              ) : (
                <span>
                  {isEnglish ? 'Load more' : 'Mehr laden'} <span aria-hidden="true">↓</span>
                </span>
              )}
            </NextLink>
          </div>
        );
      }}
    </Pagination>
  );
}

