import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ThemedComponent } from '../../theme-support/themed.component';
import { SearchSidebarComponent } from './search-sidebar.component';
import { SearchConfigurationOption } from '../search-switch-configuration/search-configuration-option.model';
import { SortOptions } from '../../../core/cache/models/sort-options.model';
import { ViewMode } from '../../../core/shared/view-mode.model';
import { PaginatedSearchOptions } from '../models/paginated-search-options.model';
import { BehaviorSubject, Observable } from 'rxjs';
import { RemoteData } from '../../../core/data/remote-data';
import { SearchFilterConfig } from '../models/search-filter-config.model';
import { AppliedFilter } from '../models/applied-filter.model';

/**
 * Themed wrapper for SearchSidebarComponent
 */
@Component({
  selector: 'ds-themed-search-sidebar',
  templateUrl: '../../theme-support/themed.component.html',
})
export class ThemedSearchSidebarComponent extends ThemedComponent<SearchSidebarComponent> {

  @Input() configuration: string;
  @Input() configurationList: SearchConfigurationOption[];
  @Input() currentScope: string;
  @Input() currentSortOption: SortOptions;
  @Input() filters: Observable<RemoteData<SearchFilterConfig[]>>;
  @Input() resultCount: number;
  @Input() viewModeList: ViewMode[];
  @Input() showViewModes: boolean;
  @Input() inPlaceSearch: boolean;
  @Input() searchOptions: PaginatedSearchOptions;
  @Input() sortOptionsList: SortOptions[];
  @Input() refreshFilters: BehaviorSubject<boolean>;
  @Output() toggleSidebar: EventEmitter<boolean> = new EventEmitter();
  @Output() changeConfiguration: EventEmitter<SearchConfigurationOption> = new EventEmitter();
  @Output() changeAppliedFilters: EventEmitter<Map<string, AppliedFilter[]>> = new EventEmitter();
  @Output() changeViewMode: EventEmitter<ViewMode> = new EventEmitter();

  protected inAndOutputNames: (keyof SearchSidebarComponent & keyof this)[] = [
    'configuration', 'configurationList', 'currentScope', 'currentSortOption',
    'resultCount', 'filters', 'viewModeList', 'showViewModes', 'inPlaceSearch',
    'searchOptions', 'sortOptionsList', 'refreshFilters', 'toggleSidebar', 'changeConfiguration',
    'changeAppliedFilters',
    'changeViewMode',
  ];

  protected getComponentName(): string {
    return 'SearchSidebarComponent';
  }

  protected importThemedComponent(themeName: string): Promise<any> {
    return import(`../../../../themes/${themeName}/app/shared/search/search-sidebar/search-sidebar.component`);
  }

  protected importUnthemedComponent(): Promise<any> {
    return import('./search-sidebar.component');
  }
}
